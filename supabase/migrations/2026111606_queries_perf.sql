-- Same results as 2026111605, computed once per call instead of once per row per helper.
-- contact_flags parses the filters a single time and returns each live contact's per-group
-- match flags; search_contacts and contact_facets only combine them.

-- Replaced by contact_flags / filter_set.
drop function public.contact_matches(public.contacts, jsonb, date, text, text);
drop function public.follow_up_hit(public.contacts, text, date, date, date);
drop function public.in_set(jsonb, text);

-- NULL means "no filter" (as in_set: empty or non-array); otherwise the string members, maybe none.
create function public.filter_set(arr jsonb) returns text[]
language sql immutable set search_path = public, pg_temp
as $$
  select case when jsonb_typeof(arr) = 'array' and arr <> '[]' then
    coalesce((select array_agg(e #>> '{}') from jsonb_array_elements(arr) e where jsonb_typeof(e) = 'string'), '{}')
  end;
$$;

-- nf must come from norm_filters. One row per live contact: one match flag per filter group
-- (q, status, matter, source, follow-up, created) plus the four follow-up bucket flags.
create function public.contact_flags(nf jsonb, today date, tz text)
returns table(
  id uuid, status text, matter_type text, referral_source text,
  q_ok boolean, status_ok boolean, matter_ok boolean, source_ok boolean, fu_ok boolean, created_ok boolean,
  is_overdue boolean, is_due_today boolean, is_next7 boolean, is_none boolean)
language sql stable set search_path = public, pg_temp
as $$
  with p as (
    select lower(nf->>'q') as lq,
      case when length(regexp_replace(nf->>'q', '\D', '', 'g')) >= 3
        then regexp_replace(nf->>'q', '\D', '', 'g') end as qd,
      public.filter_set(nf->'status') as st,
      public.filter_set(nf->'matterType') as mt,
      public.filter_set(nf->'referralSource') as rs,
      nf->>'followUp' as fu,
      (nf->>'followUpFrom')::date as lo, (nf->>'followUpTo')::date as hi,
      (nf->>'createdFrom')::date as clo, (nf->>'createdTo')::date as chi)
  select c.id, c.status::text, c.matter_type::text, c.referral_source::text,
    p.lq is null
      or strpos(lower(c.full_name), p.lq) > 0
      or strpos(lower(coalesce(c.email, '')), p.lq) > 0
      or strpos(lower(coalesce(c.summary, '')), p.lq) > 0
      or (p.qd is not null and strpos(c.phone_digits, p.qd) > 0),
    p.st is null or coalesce(c.status::text = any(p.st), false),
    p.mt is null or coalesce(c.matter_type::text = any(p.mt), false),
    p.rs is null or coalesce(c.referral_source::text = any(p.rs), false),
    case p.fu
      when 'overdue' then b.overdue when 'dueToday' then b.due_today
      when 'next7Days' then b.next7 when 'none' then b.none
      when 'custom' then c.follow_up_on is not null
        and (p.lo is null or c.follow_up_on >= p.lo) and (p.hi is null or c.follow_up_on <= p.hi)
      else true end,
    (p.clo is null or b.cd >= p.clo) and (p.chi is null or b.cd <= p.chi),
    b.overdue, b.due_today, b.next7, b.none
  from public.contacts c
  cross join p
  cross join lateral (select
    coalesce(c.status <> 'closed' and c.follow_up_on < today, false) as overdue,
    coalesce(c.status <> 'closed' and c.follow_up_on = today, false) as due_today,
    coalesce(c.follow_up_on >= today and c.follow_up_on < today + 7, false) as next7,
    c.follow_up_on is null as none,
    (c.created_at at time zone tz)::date as cd) b
  where c.deleted_at is null;
$$;

create or replace function public.search_contacts(
  f jsonb, sort text default 'follow_up', dir text default 'asc',
  page int default 1, page_size int default 250, tz text default 'UTC')
returns jsonb
language plpgsql stable set search_path = public, pg_temp
as $$
declare
  z text := public.safe_tz(tz);
  today date := (now() at time zone public.safe_tz(tz))::date;
  nf jsonb := public.norm_filters(f);
  size int := case when page_size in (25, 50, 100, 250, 500) then page_size else 250 end;
  d text := case when dir = 'desc' then 'desc' else 'asc' end;
  ord text; result jsonb;
begin
  -- ord is built only from these literals, never from caller text.
  ord := case sort
    when 'name' then format('c.full_name %s', d)
    when 'waiting' then format('c.created_at %s', d)
    when 'updated' then format('c.updated_at %s', d)
    when 'status' then format('c.status %s', d)
    else format($o$case when c.status in ('lead', 'active') and c.follow_up_on < $2 then 0
      when c.status in ('lead', 'active') and c.follow_up_on = $2 then 1
      when c.status in ('lead', 'active') and c.follow_up_on is not null then 2
      when c.follow_up_on is not null then 3 else 4 end %1$s,
      c.follow_up_on %1$s nulls last$o$, d)
  end;

  -- One filtered pass: fl is read for the counts and for the page.
  execute format($q$
    with fl as materialized (
      select *, q_ok and status_ok and matter_ok and source_ok and fu_ok and created_ok as ok
      from public.contact_flags($1, $2, $3)),
    cnt as (
      select count(*) as total, count(*) filter (where ok) as matching from fl),
    pp as (
      select total, matching,
        (least(greatest(coalesce($5, 1), 1), greatest(1, ceil(matching::numeric / $4)::int)) - 1) * $4 as skip
      from cnt)
    select jsonb_build_object(
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', c.id, 'full_name', c.full_name, 'email', c.email, 'phone', c.phone,
          'matter_type', c.matter_type, 'referral_source', c.referral_source, 'status', c.status,
          'follow_up_on', c.follow_up_on, 'created_at', c.created_at, 'updated_at', c.updated_at,
          'urgency', case when c.status <> 'closed' and c.follow_up_on < $2 then 'overdue'
                          when c.status <> 'closed' and c.follow_up_on = $2 then 'today'
                          when c.follow_up_on is not null then 'later' else 'none' end,
          'days_overdue', case when c.status <> 'closed' and c.follow_up_on < $2 then $2 - c.follow_up_on end
        ) order by c.n)
        from (
          select c.*, row_number() over (order by %s, c.updated_at desc, c.id) n
          from fl join public.contacts c on c.id = fl.id where fl.ok
          order by n limit $4 offset (select skip from pp)) c), '[]'),
      'total', (select total from pp), 'matching', (select matching from pp))
  $q$, ord) into result using nf, today, z, size, page;

  return result;
end;
$$;

create or replace function public.contact_facets(f jsonb, tz text default 'UTC') returns jsonb
language plpgsql stable set search_path = public, pg_temp
as $$
declare
  z text := public.safe_tz(tz);
  today date := (now() at time zone public.safe_tz(tz))::date;
  nf jsonb := public.norm_filters(f);
  out jsonb;
begin
  -- Each facet counts rows that pass every group except its own.
  with m as materialized (
    select status, matter_type, referral_source, is_overdue, is_due_today, is_next7, is_none,
      q_ok and created_ok and status_ok and matter_ok and source_ok and fu_ok as ok,
      q_ok and created_ok and matter_ok and source_ok and fu_ok as ok_status,
      q_ok and created_ok and status_ok and source_ok and fu_ok as ok_matter,
      q_ok and created_ok and status_ok and matter_ok and fu_ok as ok_source,
      q_ok and created_ok and status_ok and matter_ok and source_ok as ok_fu
    from public.contact_flags(nf, today, z))
  select jsonb_build_object(
    'total', (select count(*) from m),
    'matching', (select count(*) from m where ok),
    'quickViews', jsonb_build_object(
      'all', (select count(*) from m where ok_fu),
      'overdue', (select count(*) from m where ok_fu and is_overdue),
      'dueToday', (select count(*) from m where ok_fu and is_due_today)),
    'facets', jsonb_build_object(
      'status', (select jsonb_object_agg(e, (select count(*) from m where ok_status and m.status = e))
        from unnest(enum_range(null::public.contact_status)::text[]) e),
      'matterType', (select jsonb_object_agg(e, (select count(*) from m where ok_matter and m.matter_type = e))
        from unnest(enum_range(null::public.matter_type)::text[]) e),
      'referralSource', (select jsonb_object_agg(e, (select count(*) from m where ok_source and m.referral_source = e))
        from unnest(enum_range(null::public.referral_source)::text[]) e),
      'followUp', jsonb_build_object(
        'overdue', (select count(*) from m where ok_fu and is_overdue),
        'dueToday', (select count(*) from m where ok_fu and is_due_today),
        'next7Days', (select count(*) from m where ok_fu and is_next7),
        'none', (select count(*) from m where ok_fu and is_none))))
  into out;
  return out;
end;
$$;

revoke execute on function public.filter_set(jsonb), public.contact_flags(jsonb, date, text) from public, anon;
grant execute on function public.filter_set(jsonb), public.contact_flags(jsonb, date, text) to authenticated;
