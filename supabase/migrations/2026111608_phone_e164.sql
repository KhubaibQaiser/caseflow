-- Phones are stored as E.164 (+15125550148). phone_digits is generated from phone, so search by digits keeps working.
-- Assumptions: a bare 10-digit number is treated as US (+1), and text around a number such as "(cell)" is dropped
-- (non-digits are stripped). Safe for the current all-US data. The helpers below exist only for this one-off pass and are dropped.
create function public.phone_to_e164(p text)
returns text
language sql immutable
as $$
  select case
    when p is null then null
    -- Already '+' and digits only, or '+' with a national format we cannot guess: leave it.
    when p ~ '^\s*\+' then
      case when regexp_replace(p, '\D', '', 'g') ~ '^1\d{10}$' then '+' || regexp_replace(p, '\D', '', 'g') else p end
    when regexp_replace(p, '\D', '', 'g') ~ '^\d{10}$' then '+1' || regexp_replace(p, '\D', '', 'g')
    when regexp_replace(p, '\D', '', 'g') ~ '^1\d{10}$' then '+' || regexp_replace(p, '\D', '', 'g')
    else p
  end
$$;

-- Returns how many rows were rewritten. The triggers are off so updated_at and the activity log stay as they were.
create function public.normalize_contact_phones()
returns int
language plpgsql security definer set search_path = public
as $$
declare changed int;
begin
  alter table public.contacts disable trigger user;
  update public.contacts set phone = public.phone_to_e164(phone) where phone is distinct from public.phone_to_e164(phone);
  get diagnostics changed = row_count;
  alter table public.contacts enable trigger user;
  return changed;
end;
$$;

revoke execute on function public.normalize_contact_phones() from public, anon, authenticated;
grant execute on function public.normalize_contact_phones() to service_role;

select public.normalize_contact_phones();
drop function public.normalize_contact_phones();
drop function public.phone_to_e164(text);

-- seed_firm: phones are written as E.164.
create or replace function public.seed_firm(n int default 2500, actor uuid default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  firsts text[] := array[
    'Olivia','Liam','Emma','Noah','Ava','Ethan','Sophia','Mason','Isabella','Lucas',
    'Mia','Logan','Amelia','James','Harper','Elijah','Evelyn','Benjamin','Abigail','Daniel',
    'Priya','Arjun','Mei','Wei','Hiroshi','Yuki','Min-jun','Seo-yeon','Fatima','Omar',
    'Aisha','Yusuf','Amara','Chidi','Kwame','Zainab','Mateo','Sofia','Santiago','Valentina',
    'Diego','Camila','Javier','Lucia','Carlos','Ximena','Dmitri','Anastasia','Pavel','Katarina',
    'Siobhan','Declan','Niamh','Giovanni','Chiara','Luca','Elena','Tariq','Layla',
    'Hassan','Noor','Rohan','Ananya','Vikram','Kavya','Tomasz','Ingrid','Søren','Freya','Zoë','José'];
  lasts text[] := array[
    'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
    'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
    'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
    'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores',
    'Patel','Shah','Kumar','Singh','Chen','Wang','Zhang','Liu','Kim','Park',
    'Tanaka','Sato','Ali','Hassan','Ahmed','Khan','Okafor','Mensah','Kowalski','Novak',
    'Petrov','Ivanov','Rossi','Romano','Murphy','O''Brien','Larsen','Nielsen','Silva','Costa','Núñez','Müller'];
  areas text[] := array['212','312','415','512','617','713','206','305','404','602','303','503','702','801','901',
    '214','216','267','314','347','410','504','612','619','646'];
  summaries text[] := array[
    'Rear-ended at a red light; neck and back pain, treating with a chiropractor.',
    'Slip and fall at a grocery store; wrist fracture, store has not responded.',
    'Dog bite at a neighbor''s home; needs a medical records review.',
    'Seeking an uncontested divorce; agreed on custody, dividing the house.',
    'Wants to modify child support after a job loss.',
    'Custody dispute; the other parent plans to relocate out of state.',
    'Family petition for a spouse; waiting on the I-130 receipt notice.',
    'Work visa expires in 90 days; employer is slow to file the extension.',
    'Asylum claim; needs help preparing the declaration and evidence.',
    'Terminated after reporting a safety issue; suspects retaliation.',
    'Unpaid overtime for two years; kept informal records of hours.',
    'Asked to sign a severance agreement; wants it reviewed before Friday.',
    'Wants a will and a revocable trust; two children, one rental property.',
    'Updating a power of attorney after a parent''s diagnosis.',
    'Probate of a parent''s estate; no will found, three siblings.',
    'First-offense DUI; hearing set for next month.',
    'Charged with misdemeanor theft; wants to know about diversion.',
    'Record expungement for a decade-old conviction.'];
  notes text[] := array[
    'Left a voicemail; will try again tomorrow.',
    'Spoke for 20 minutes. Sent the intake questionnaire.',
    'Client emailed the requested documents.',
    'Conflict check came back clear.',
    'Reviewed the file with the attorney; next step is a consultation.',
    'Client asked about fees; sent the engagement letter.',
    'Waiting on records from the other side.',
    'Rescheduled the call to later this week.',
    'Engagement letter signed and returned.',
    'Client is reachable by text only after 5pm.'];
begin
  if n < 0 or n > 100000 then
    raise exception 'seed_firm: n must be between 0 and 100000';
  end if;
  perform set_config('caseflow.seeding', 'on', true);
  perform setseed(0.42);

  truncate public.contacts, public.notes, public.activities;

  insert into public.contacts
    (full_name, email, phone, matter_type, referral_source, status, follow_up_on, summary, created_by, updated_by, created_at, updated_at)
  select
    g.fn || ' ' || g.ln,
    case when g.rc >= 0.2 then lower(regexp_replace(g.fn || '.' || g.ln, '[^A-Za-z.]', '', 'g')) || g.i || '@example.test' end,
    case when g.rc < 0.2 or g.rc >= 0.4
      then format('+1%s55501%s', areas[1 + ((g.i / 100) % 25)], lpad((g.i % 100)::text, 2, '0')) end,
    m.matter,
    case when g.rsrc < 0.1 then null
      else (enum_range(null::public.referral_source))[1 + floor((g.rsrc - 0.1) / 0.9 * 5)::int] end,
    st.status,
    case
      when st.status = 'closed' then
        case when g.rf < 0.25 then current_date + (1 + floor(g.rd * 45))::int end
      when g.rf < 0.04 then current_date - (1 + floor(g.rd * 10))::int
      when g.rf < 0.06 then current_date
      when g.rf < 0.98 then current_date + (1 + floor(g.rd * 45))::int
    end,
    summaries[(array_position(enum_range(null::public.matter_type), m.matter) - 1) * 3 + 1 + floor(g.rsum * 3)::int],
    actor,
    actor,
    now() - g.rca * interval '120 days',
    now() - g.rca * interval '120 days' + g.rup * g.rca * interval '120 days'
  from (
    select i,
      firsts[1 + floor(random() * array_length(firsts, 1))::int] as fn,
      lasts[1 + floor(random() * array_length(lasts, 1))::int] as ln,
      random() as rs, random() as rc, random() as rm, random() as rsrc, random() as rf,
      random() as rd, random() as rca, random() as rup, random() as rsum
    from generate_series(1, n) i
  ) g
  cross join lateral (select (case
      when g.rs < 0.26 then 'lead' when g.rs < 0.52 then 'active' else 'closed' end)::public.contact_status as status) st
  cross join lateral (select (case
      when g.rm < 0.25 then 'personal_injury' when g.rm < 0.45 then 'family'
      when g.rm < 0.60 then 'immigration' when g.rm < 0.75 then 'employment'
      when g.rm < 0.85 then 'estate_planning' else 'criminal_defense' end)::public.matter_type as matter) m;

  -- Every contact starts as a lead; active and closed ones then change status (closed: half go via active).
  with c as materialized (
    select id, status, created_at, updated_at, random() < 0.5 as via_active from public.contacts
  )
  insert into public.activities (contact_id, actor_id, type, payload, created_at)
  select id, actor, 'created'::public.activity_type, jsonb_build_object('status', 'lead'), created_at from c
  union all
  select id, actor, 'status_changed', jsonb_build_object('from', 'lead', 'to', 'active'),
    case when status = 'active' then updated_at else created_at + (updated_at - created_at) / 2 end
  from c where status = 'active' or (status = 'closed' and via_active)
  union all
  select id, actor, 'status_changed',
    jsonb_build_object('from', case when via_active then 'active' else 'lead' end, 'to', 'closed'), updated_at
  from c where status = 'closed';

  if actor is not null then
    insert into public.notes (contact_id, author_id, body, body_json, created_at)
    select c.id, actor, n.body, n.doc, c.created_at + (now() - c.created_at) * random()
    from (select id, created_at, floor(random() * 4)::int as k from public.contacts) c
    cross join lateral generate_series(1, c.k) s (i)
    cross join lateral public.seed_note(notes, s.i) n;
  end if;

end;
$$;

revoke execute on function public.seed_firm(int, uuid) from public, anon, authenticated;
grant execute on function public.seed_firm(int, uuid) to service_role;
