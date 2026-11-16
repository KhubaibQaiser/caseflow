-- Audit fields, delete guard and activity log. Spec §6.
create function public.contacts_before_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- auth.uid() wins; seed path has no uid so the supplied value stays.
    new.created_by := coalesce(auth.uid(), new.created_by);
    if not (current_setting('caseflow.seeding', true) = 'on' and auth.uid() is null) then
      new.created_at := now();
    end if;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();

  if new.deleted_at is distinct from (case when tg_op = 'UPDATE' then old.deleted_at end)
     and not public.has_permission('contacts.delete') then
    raise exception 'forbidden: contacts.delete' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create function public.contacts_after_write()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := auth.uid();
  changed text[];
begin
  if current_setting('caseflow.seeding', true) = 'on' and auth.uid() is null then
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into public.activities (contact_id, actor_id, type, payload)
    values (new.id, actor, 'created', jsonb_build_object('status', new.status));
    return null;
  end if;

  if new.status is distinct from old.status then
    insert into public.activities (contact_id, actor_id, type, payload)
    values (new.id, actor, 'status_changed', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.follow_up_on is distinct from old.follow_up_on then
    insert into public.activities (contact_id, actor_id, type, payload)
    values (new.id, actor, 'follow_up_changed',
      jsonb_build_object('from', old.follow_up_on, 'to', new.follow_up_on));
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    insert into public.activities (contact_id, actor_id, type)
    values (new.id, actor,
      (case when new.deleted_at is null then 'restored' else 'deleted' end)::public.activity_type);
  end if;

  select coalesce(array_agg(n.key order by n.key), '{}') into changed
  from jsonb_each(to_jsonb(new)) n
  join jsonb_each(to_jsonb(old)) o using (key)
  where n.value is distinct from o.value
    and n.key not in ('status', 'follow_up_on', 'deleted_at', 'updated_at', 'updated_by', 'phone_digits');
  if cardinality(changed) > 0 then
    insert into public.activities (contact_id, actor_id, type, payload)
    values (new.id, actor, 'updated', jsonb_build_object('fields', to_jsonb(changed)));
  end if;
  return null;
end;
$$;

create function public.notes_after_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if current_setting('caseflow.seeding', true) = 'on' and auth.uid() is null then
    return null;
  end if;
  insert into public.activities (contact_id, actor_id, type, payload)
  values (new.contact_id, auth.uid(), 'note_added', jsonb_build_object('note_id', new.id));
  return null;
end;
$$;

revoke execute on function public.contacts_before_write(), public.contacts_after_write(),
  public.notes_after_insert() from public, anon, authenticated;

create trigger contacts_before_write before insert or update on public.contacts
  for each row execute function public.contacts_before_write();
create trigger contacts_after_write after insert or update on public.contacts
  for each row execute function public.contacts_after_write();
create trigger notes_after_insert after insert on public.notes
  for each row execute function public.notes_after_insert();

-- Seed/test entry point: inserts one contact with activity logging off (same transaction).
create function public.seed_insert_contact(c jsonb)
returns uuid
language plpgsql set search_path = public
as $$
declare
  new_id uuid;
begin
  perform set_config('caseflow.seeding', 'on', true);
  insert into public.contacts (full_name, email, phone, matter_type, referral_source, status, follow_up_on, summary, created_by, created_at)
  select r.full_name, r.email, r.phone, r.matter_type, r.referral_source, coalesce(r.status, 'lead'), r.follow_up_on, r.summary, r.created_by, coalesce(r.created_at, now())
  from jsonb_populate_record(null::public.contacts, c) r
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.seed_insert_contact(jsonb) from public, anon, authenticated;
grant execute on function public.seed_insert_contact(jsonb) to service_role;
