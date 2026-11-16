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
