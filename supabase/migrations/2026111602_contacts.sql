-- Firm data: contacts, notes, activities. Values mirror lib/contracts/enums.ts.
create type public.contact_status as enum ('lead', 'active', 'closed');
create type public.matter_type as enum
  ('personal_injury', 'family', 'immigration', 'employment', 'estate_planning', 'criminal_defense');
create type public.referral_source as enum
  ('google_search', 'past_client', 'attorney_referral', 'bar_referral', 'website_form');
create type public.activity_type as enum
  ('created', 'updated', 'status_changed', 'follow_up_changed', 'note_added', 'deleted', 'restored');

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null
    constraint contacts_full_name_len check (full_name = btrim(full_name) and char_length(full_name) between 2 and 120),
  email text,
  phone text,
  phone_digits text generated always as (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) stored,
  matter_type public.matter_type not null,
  referral_source public.referral_source,
  status public.contact_status not null default 'lead',
  follow_up_on date,
  summary text constraint contacts_summary_len check (char_length(summary) <= 1000),
  created_by uuid references public.profiles (user_id) default auth.uid(),
  updated_by uuid references public.profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint contacts_email_or_phone check (email is not null or phone is not null)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  author_id uuid not null references public.profiles (user_id),
  body text not null constraint notes_body_len check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  actor_id uuid references public.profiles (user_id),
  type public.activity_type not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index contacts_status_follow_up_idx on public.contacts (status, follow_up_on);
create index contacts_created_at_idx on public.contacts (created_at);
create index contacts_updated_at_idx on public.contacts (updated_at);
create index contacts_live_idx on public.contacts (updated_at desc) where deleted_at is null;
create index notes_contact_idx on public.notes (contact_id, created_at desc);
create index activities_contact_idx on public.activities (contact_id, created_at desc);

-- RLS
alter table public.contacts enable row level security;
alter table public.notes enable row level security;
alter table public.activities enable row level security;

create policy contacts_select on public.contacts for select to authenticated
  using ((select public.has_permission('contacts.read')));
create policy contacts_insert on public.contacts for insert to authenticated
  with check ((select public.has_permission('contacts.write')));
create policy contacts_update on public.contacts for update to authenticated
  using ((select public.has_permission('contacts.write')))
  with check ((select public.has_permission('contacts.write')));
-- no delete policy: clients cannot hard-delete

create policy notes_select on public.notes for select to authenticated
  using ((select public.has_permission('contacts.read')));
create policy notes_insert on public.notes for insert to authenticated
  with check ((select public.has_permission('notes.write')) and author_id = (select auth.uid()));

create policy activities_select on public.activities for select to authenticated
  using ((select public.has_permission('contacts.read')));

revoke all on public.contacts, public.notes, public.activities from anon;
revoke delete, truncate on public.contacts, public.notes, public.activities from authenticated;
revoke update on public.notes from authenticated;
revoke insert, update on public.activities from authenticated;

-- Triggers
create function public.contacts_before_write() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    -- soft delete / restore needs contacts.delete; service role and SQL (no JWT user) pass
    if new.deleted_at is distinct from old.deleted_at
       and auth.uid() is not null
       and not public.has_permission('contacts.delete') then
      raise exception 'contacts.delete permission required' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger contacts_before_write before insert or update on public.contacts
  for each row execute function public.contacts_before_write();

-- Activities are written only here (security definer; clients have no insert grant).
create function public.log_contact_activity() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  fields text[] := '{}';
begin
  if current_setting('caseflow.seeding', true) = 'on' then return null; end if;

  if tg_table_name = 'notes' then
    insert into activities (contact_id, actor_id, type) values (new.contact_id, auth.uid(), 'note_added');
  elsif tg_op = 'INSERT' then
    insert into activities (contact_id, actor_id, type) values (new.id, auth.uid(), 'created');
  else
    if new.deleted_at is distinct from old.deleted_at then
      insert into activities (contact_id, actor_id, type)
        values (new.id, auth.uid(), case when new.deleted_at is null then 'restored' else 'deleted' end);
    end if;
    if new.status is distinct from old.status then
      insert into activities (contact_id, actor_id, type, payload)
        values (new.id, auth.uid(), 'status_changed', jsonb_build_object('from', old.status, 'to', new.status));
    end if;
    if new.follow_up_on is distinct from old.follow_up_on then
      insert into activities (contact_id, actor_id, type, payload)
        values (new.id, auth.uid(), 'follow_up_changed', jsonb_build_object('from', old.follow_up_on, 'to', new.follow_up_on));
    end if;
    if new.full_name is distinct from old.full_name then fields := fields || 'full_name'::text; end if;
    if new.email is distinct from old.email then fields := fields || 'email'::text; end if;
    if new.phone is distinct from old.phone then fields := fields || 'phone'::text; end if;
    if new.matter_type is distinct from old.matter_type then fields := fields || 'matter_type'::text; end if;
    if new.referral_source is distinct from old.referral_source then fields := fields || 'referral_source'::text; end if;
    if new.summary is distinct from old.summary then fields := fields || 'summary'::text; end if;
    if array_length(fields, 1) > 0 then
      insert into activities (contact_id, actor_id, type, payload)
        values (new.id, auth.uid(), 'updated', jsonb_build_object('fields', to_jsonb(fields)));
    end if;
  end if;
  return null;
end $$;

revoke execute on function public.log_contact_activity() from public, anon, authenticated;

create trigger contacts_activity after insert or update on public.contacts
  for each row execute function public.log_contact_activity();
create trigger notes_activity after insert on public.notes
  for each row execute function public.log_contact_activity();
