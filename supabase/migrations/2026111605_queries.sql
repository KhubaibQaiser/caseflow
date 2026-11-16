-- Query RPCs behind the contacts list, filters, facets and pipeline. Spec §7.2-7.4.
-- All run as the caller (security invoker), so RLS decides what is visible.

create function public.safe_tz(tz text) returns text
language sql stable set search_path = public, pg_temp
as $$
  select coalesce((select name from pg_timezone_names where name = tz limit 1), 'UTC');
$$;

create function public.safe_date(s text) returns date
language plpgsql immutable set search_path = public, pg_temp
as $$
begin
  if s !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  return s::date;
exception when others then
  return null;
end;
$$;

-- Canonical filters: unknown keys dropped, bad dates/values ignored, rules as FiltersSchema.
create function public.norm_filters(f jsonb) returns jsonb
language plpgsql stable set search_path = public, pg_temp
as $$
declare
  fu text;
  lo date; hi date; clo date; chi date;
begin
  if jsonb_typeof(f) is distinct from 'object' then return '{}'; end if;
  fu := case when f->>'followUp' in ('overdue', 'dueToday', 'next7Days', 'none', 'custom') then f->>'followUp' end;
  lo := public.safe_date(f->>'followUpFrom');
  hi := public.safe_date(f->>'followUpTo');
  if fu is distinct from 'custom' or lo > hi then lo := null; hi := null; end if;
  if fu = 'custom' and lo is null and hi is null then fu := null; end if;
  clo := public.safe_date(f->>'createdFrom');
  chi := public.safe_date(f->>'createdTo');
  if clo > chi then clo := null; chi := null; end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'q', nullif(btrim(left(btrim(f->>'q'), 100)), ''),
    'status', f->'status', 'matterType', f->'matterType', 'referralSource', f->'referralSource',
    'followUp', fu, 'followUpFrom', lo, 'followUpTo', hi, 'createdFrom', clo, 'createdTo', chi));
end;
$$;

-- Empty or non-array means "no filter"; a null value never matches a non-empty set.
create function public.in_set(arr jsonb, v text) returns boolean
language sql immutable set search_path = public, pg_temp
as $$
  select jsonb_typeof(arr) is distinct from 'array' or arr = '[]' or coalesce(arr @> to_jsonb(v), false);
$$;

-- Only lead and active can be overdue or due today; next7Days is today <= d < today + 7.
create function public.follow_up_hit(c public.contacts, k text, today date, lo date, hi date)
returns boolean
language sql immutable set search_path = public, pg_temp
as $$
  select coalesce(case k
    when 'overdue' then c.status <> 'closed' and c.follow_up_on < today
    when 'dueToday' then c.status <> 'closed' and c.follow_up_on = today
    when 'next7Days' then c.follow_up_on >= today and c.follow_up_on < today + 7
    when 'none' then c.follow_up_on is null
    when 'custom' then c.follow_up_on is not null
      and (lo is null or c.follow_up_on >= lo) and (hi is null or c.follow_up_on <= hi)
  end, false);
$$;

-- f must come from norm_filters. skip names the group left out: status, matterType,
-- referralSource, followUp or created. q and deleted_at always apply.
create function public.contact_matches(c public.contacts, f jsonb, today date, tz text, skip text default null)
returns boolean
language sql stable set search_path = public, pg_temp
as $$
  select c.deleted_at is null
    and (f->>'q' is null
      or strpos(lower(c.full_name), lower(f->>'q')) > 0
      or strpos(lower(coalesce(c.email, '')), lower(f->>'q')) > 0
      or strpos(lower(coalesce(c.summary, '')), lower(f->>'q')) > 0
      or (length(regexp_replace(f->>'q', '\D', '', 'g')) >= 3
        and strpos(c.phone_digits, regexp_replace(f->>'q', '\D', '', 'g')) > 0))
    and (skip = 'status' or public.in_set(f->'status', c.status::text))
    and (skip = 'matterType' or public.in_set(f->'matterType', c.matter_type::text))
    and (skip = 'referralSource' or public.in_set(f->'referralSource', c.referral_source::text))
    and (skip = 'followUp' or f->>'followUp' is null
      or public.follow_up_hit(c, f->>'followUp', today, (f->>'followUpFrom')::date, (f->>'followUpTo')::date))
    and (skip = 'created'
      or ((f->>'createdFrom') is null or (c.created_at at time zone tz)::date >= (f->>'createdFrom')::date)
      and ((f->>'createdTo') is null or (c.created_at at time zone tz)::date <= (f->>'createdTo')::date));
$$;

create function public.search_contacts(
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
  ord text;
  matching int; total int; pg int; result jsonb;
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

  select count(*) filter (where public.contact_matches(c, nf, today, z)), count(*)
    into matching, total from public.contacts c where c.deleted_at is null;
  pg := least(greatest(coalesce(page, 1), 1), greatest(1, ceil(matching::numeric / size)::int));

  execute format($q$
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'full_name', c.full_name, 'email', c.email, 'phone', c.phone,
      'matter_type', c.matter_type, 'referral_source', c.referral_source, 'status', c.status,
      'follow_up_on', c.follow_up_on, 'created_at', c.created_at, 'updated_at', c.updated_at,
      'urgency', case when c.status <> 'closed' and c.follow_up_on < $2 then 'overdue'
                      when c.status <> 'closed' and c.follow_up_on = $2 then 'today'
                      when c.follow_up_on is not null then 'later' else 'none' end,
      'days_overdue', case when c.status <> 'closed' and c.follow_up_on < $2 then $2 - c.follow_up_on end
    ) order by c.n), '[]')
    from (
      select c.*, row_number() over (order by %s, c.updated_at desc, c.id) n
      from public.contacts c where public.contact_matches(c, $1, $2, $3)
      order by n limit $4 offset $5) c
  $q$, ord) into result using nf, today, z, size, (pg - 1) * size;

  return jsonb_build_object('rows', result, 'total', total, 'matching', matching);
end;
$$;

-- One pass computes each row's match flags; the counts read that result.
create function public.contact_facets(f jsonb, tz text default 'UTC') returns jsonb
language plpgsql stable set search_path = public, pg_temp
as $$
declare
  z text := public.safe_tz(tz);
  today date := (now() at time zone public.safe_tz(tz))::date;
  nf jsonb := public.norm_filters(f);
  out jsonb;
begin
  with m as materialized (
    select c,
      public.contact_matches(c, nf, today, z) as ok,
      public.contact_matches(c, nf, today, z, 'status') as ok_status,
      public.contact_matches(c, nf, today, z, 'matterType') as ok_matter,
      public.contact_matches(c, nf, today, z, 'referralSource') as ok_source,
      public.contact_matches(c, nf, today, z, 'followUp') as ok_fu
    from public.contacts c where c.deleted_at is null)
  select jsonb_build_object(
    'total', (select count(*) from m),
    'matching', (select count(*) from m where ok),
    'quickViews', jsonb_build_object(
      'all', (select count(*) from m where ok_fu),
      'overdue', (select count(*) from m where ok_fu and public.follow_up_hit(c, 'overdue', today, null, null)),
      'dueToday', (select count(*) from m where ok_fu and public.follow_up_hit(c, 'dueToday', today, null, null))),
    'facets', jsonb_build_object(
      'status', (select jsonb_object_agg(e, (select count(*) from m where ok_status and (c).status::text = e))
        from unnest(enum_range(null::public.contact_status)::text[]) e),
      'matterType', (select jsonb_object_agg(e, (select count(*) from m where ok_matter and (c).matter_type::text = e))
        from unnest(enum_range(null::public.matter_type)::text[]) e),
      'referralSource', (select jsonb_object_agg(e, (select count(*) from m where ok_source and (c).referral_source::text = e))
        from unnest(enum_range(null::public.referral_source)::text[]) e),
      'followUp', (select jsonb_object_agg(e, (select count(*) from m where ok_fu and public.follow_up_hit(c, e, today, null, null)))
        from unnest(array['overdue', 'dueToday', 'next7Days', 'none']) e)))
  into out;
  return out;
end;
$$;

-- Keep-alive target: no data access, so anon may call it with the publishable key.
create function public.ping() returns boolean
language sql stable set search_path = public, pg_temp
as $$ select true; $$;

revoke execute on function
  public.safe_tz(text), public.safe_date(text), public.norm_filters(jsonb), public.in_set(jsonb, text),
  public.follow_up_hit(public.contacts, text, date, date, date),
  public.contact_matches(public.contacts, jsonb, date, text, text),
  public.search_contacts(jsonb, text, text, int, int, text),
  public.contact_facets(jsonb, text)
  from public, anon;
grant execute on function
  public.safe_tz(text), public.safe_date(text), public.norm_filters(jsonb), public.in_set(jsonb, text),
  public.follow_up_hit(public.contacts, text, date, date, date),
  public.contact_matches(public.contacts, jsonb, date, text, text),
  public.search_contacts(jsonb, text, text, int, int, text),
  public.contact_facets(jsonb, text)
  to authenticated;
revoke execute on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
