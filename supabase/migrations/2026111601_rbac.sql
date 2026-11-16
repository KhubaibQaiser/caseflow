-- RBAC: roles, permissions, profiles, has_permission(). Values mirror lib/contracts/permissions.ts.
create type public.app_role as enum ('admin', 'viewer');
create type public.app_permission as enum ('contacts.read', 'contacts.write', 'contacts.delete', 'notes.write');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role public.app_role not null
);

create table public.role_permissions (
  role public.app_role not null,
  permission public.app_permission not null,
  primary key (role, permission)
);

insert into public.role_permissions (role, permission) values
  ('admin', 'contacts.read'), ('admin', 'contacts.write'),
  ('admin', 'contacts.delete'), ('admin', 'notes.write'),
  ('viewer', 'contacts.read');

create function public.has_permission(p public.app_permission)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles pr
    join public.role_permissions rp on rp.role = pr.role
    where pr.user_id = (select auth.uid()) and rp.permission = p
  );
$$;

revoke execute on function public.has_permission(public.app_permission) from public, anon;
grant execute on function public.has_permission(public.app_permission) to authenticated;

alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;

-- Read-only for clients: no insert/update/delete policies exist.
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy role_permissions_select on public.role_permissions for select to authenticated using (true);

revoke all on public.profiles, public.role_permissions from anon;
revoke insert, update, delete, truncate on public.profiles, public.role_permissions from authenticated;
