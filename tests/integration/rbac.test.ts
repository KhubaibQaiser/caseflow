import { docFromText } from '@/lib/contracts/rich-text';
import { beforeEach, describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/contracts/permissions';
import {
  adminClient,
  anonClient,
  anonSignedIn,
  PASSWORD,
  serviceClient,
  assertLocalUrl,
  resetData,
  seedContact,
  viewerClient,
} from './setup';

beforeEach(resetData);

it('refuses non-local Supabase URLs', () => {
  expect(() => assertLocalUrl('https://abc.supabase.co')).toThrow();
  expect(assertLocalUrl('http://127.0.0.1:54321')).toBeTruthy();
});

describe('RBAC and RLS', () => {
  it('viewer can read but not insert, update or note', async () => {
    const v = await viewerClient();
    const a = await adminClient();
    const { data: c, error } = await seedContact(a.client, {
      full_name: 'Ana Ruiz',
      phone: '5125550101',
      matter_type: 'family',
    });
    expect(error).toBeNull();
    expect(
      (await v.client.from('contacts').select('id').eq('id', c.id)).data,
    ).toHaveLength(1);
    expect(
      (
        await v.client.from('contacts').insert({
          full_name: 'X Y',
          phone: '5125550102',
          matter_type: 'family',
        })
      ).error,
    ).not.toBeNull();
    const upd = await v.client
      .from('contacts')
      .update({ full_name: 'Hacked' })
      .eq('id', c.id)
      .select();
    expect(upd.data ?? []).toHaveLength(0);
    expect(
      (
        await v.client.from('notes').insert({
          contact_id: c.id,
          body: 'x',
          body_json: docFromText('x'),
          author_id: v.userId,
        })
      ).error,
    ).not.toBeNull();
  });

  it('admin can insert, update and add notes', async () => {
    const a = await adminClient();
    const { data: c, error } = await seedContact(a.client, {
      full_name: 'Ben Cole',
      email: 'ben@example.com',
    });
    expect(error).toBeNull();
    const upd = await a.client
      .from('contacts')
      .update({ full_name: 'Ben Coleman' })
      .eq('id', c.id)
      .select();
    expect(upd.error).toBeNull();
    expect(upd.data).toHaveLength(1);
    const note = await a.client.from('notes').insert({
      contact_id: c.id,
      body: 'Called',
      body_json: docFromText('Called'),
      author_id: a.userId,
    });
    expect(note.error).toBeNull();
  });

  it('the database refuses a note whose body_json is not an object', async () => {
    const a = await adminClient();
    const { data: c } = await seedContact(a.client, {
      full_name: 'Di Ellis',
      email: 'di@example.com',
    });
    for (const bad of ['text', [], null]) {
      const { error } = await a.client.from('notes').insert({
        contact_id: c.id,
        body: 'x',
        body_json: bad as never,
        author_id: a.userId,
      });
      expect(error, JSON.stringify(bad)).not.toBeNull();
    }
  });

  it('admin cannot forge note author or hard-delete', async () => {
    const a = await adminClient();
    const v = await viewerClient();
    const { data: c } = await seedContact(a.client, {
      full_name: 'Cy Dunn',
      email: 'cy@example.com',
    });
    expect(
      (
        await a.client.from('notes').insert({
          contact_id: c.id,
          body: 'x',
          body_json: docFromText('x'),
          author_id: v.userId,
        })
      ).error,
    ).not.toBeNull();
    await a.client.from('contacts').delete().eq('id', c.id);
    const still = await a.client.from('contacts').select('id').eq('id', c.id);
    expect(still.data).toHaveLength(1);
  });

  it('clients cannot write profiles, role_permissions or activities', async () => {
    const v = await viewerClient();
    const a = await adminClient();
    const p = await v.client
      .from('profiles')
      .update({ role: 'admin' })
      .eq('user_id', v.userId)
      .select();
    expect(p.data ?? []).toHaveLength(0);
    expect(
      (
        await a.client
          .from('role_permissions')
          .insert({ role: 'viewer', permission: 'contacts.write' })
      ).error,
    ).not.toBeNull();
    expect(
      (await a.client.from('activities').insert({ type: 'created' })).error,
    ).not.toBeNull();
  });

  it('role_permissions matches ROLE_PERMISSIONS', async () => {
    const v = await viewerClient();
    const { data, error } = await v.client.from('role_permissions').select('*');
    expect(error).toBeNull();
    const grouped: Record<string, string[]> = {};
    for (const r of data ?? []) (grouped[r.role] ??= []).push(r.permission);
    for (const list of Object.values(grouped)) list.sort();
    const expected = Object.fromEntries(
      Object.entries(ROLE_PERMISSIONS).map(([k, p]) => [k, [...p].sort()]),
    );
    expect(grouped).toEqual(expected);
  });

  it('rejects contact with neither email nor phone', async () => {
    const a = await adminClient();
    const r = await seedContact(a.client, { full_name: 'No Contact' });
    expect(r.error?.code).toBe('23514');
  });

  it('rejects blank email/phone and untrimmed names', async () => {
    const a = await adminClient();
    for (const blank of [{ email: '' }, { email: '  ', phone: '\t' }]) {
      const r = await seedContact(a.client, {
        full_name: 'Blank One',
        ...blank,
      });
      expect(r.error?.code).toBe('23514');
    }
    const n = await seedContact(a.client, {
      full_name: '\tName\n',
      email: 'n@example.com',
    });
    expect(n.error?.code).toBe('23514');
  });

  it('user cannot grant themselves a role', async () => {
    const v = await viewerClient();
    const ins = await v.client
      .from('profiles')
      .insert({ user_id: v.userId, display_name: 'x', role: 'admin' });
    expect(ins.error).not.toBeNull();
  });

  it('has_permission is right per role and false without a profile', async () => {
    const a = await adminClient();
    const v = await viewerClient();
    const ask = async (c: typeof a.client, p: string) =>
      (await c.rpc('has_permission', { p })).data;
    for (const p of PERMISSIONS) {
      expect(await ask(a.client, p)).toBe(true);
      expect(await ask(v.client, p)).toBe(p === 'contacts.read');
    }
    const svc = serviceClient();
    const email = 'it-noprofile@caseflow.test';
    const created = await svc.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    const id = created.data.user?.id;
    if (!id) {
      // already exists from a previous run
      const list = await svc.auth.admin.listUsers({ perPage: 1000 });
      expect(list.data.users.some((u) => u.email === email)).toBe(true);
    }
    const np = await anonSignedIn(email);
    expect(await ask(np, 'contacts.read')).toBe(false);
  });

  it('anon has no access to tables or has_permission', async () => {
    const anon = anonClient();
    for (const t of [
      'profiles',
      'role_permissions',
      'contacts',
      'notes',
      'activities',
    ]) {
      const r = await anon.from(t).select('*');
      expect(r.error !== null || (r.data ?? []).length === 0).toBe(true);
      expect(r.error).not.toBeNull();
    }
    expect(
      (await anon.rpc('has_permission', { p: 'contacts.read' })).error,
    ).not.toBeNull();
  });

  it('denies seed_firm to anon and authenticated callers', async () => {
    const a = await adminClient();
    for (const c of [anonClient(), a.client]) {
      const r = await c.rpc('seed_firm', { n: 1 });
      expect(r.error).not.toBeNull();
    }
  });
});
