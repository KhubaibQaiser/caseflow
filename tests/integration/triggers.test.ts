import { docFromText } from '@/lib/contracts/rich-text';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  adminClient,
  resetData,
  rpc,
  seedContact,
  serviceClient,
  viewerClient,
} from './setup';

beforeEach(resetData);

async function activities(contactId: string) {
  const { data, error } = await serviceClient()
    .from('activities')
    .select('type, payload, actor_id')
    .eq('contact_id', contactId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data;
}

async function newContact() {
  const a = await adminClient();
  const { data, error } = await seedContact(a.client, {
    full_name: 'Ana Ruiz',
    phone: '5125550101',
  });
  if (error) throw new Error(error.message);
  return { a, c: data as { id: string } };
}

describe('contact triggers', () => {
  it('logs created with status, and forces created_by/created_at', async () => {
    const a = await adminClient();
    const other = (await viewerClient()).userId;
    const { data, error } = await seedContact(a.client, {
      full_name: 'Forged One',
      phone: '5125550101',
      created_by: other,
      created_at: '2001-01-01T00:00:00Z',
    });
    expect(error).toBeNull();
    expect(data.created_by).toBe(a.userId);
    expect(new Date(data.created_at).getFullYear()).toBeGreaterThan(2020);
    expect(await activities(data.id)).toEqual([
      { type: 'created', payload: { status: 'lead' }, actor_id: a.userId },
    ]);
  });

  it('logs exactly one status_changed with from/to and actor', async () => {
    const { a, c } = await newContact();
    const { error } = await a.client
      .from('contacts')
      .update({ status: 'active' })
      .eq('id', c.id);
    expect(error).toBeNull();
    const rows = (await activities(c.id)).filter(
      (r) => r.type === 'status_changed',
    );
    expect(rows).toEqual([
      {
        type: 'status_changed',
        payload: { from: 'lead', to: 'active' },
        actor_id: a.userId,
      },
    ]);
  });

  it('logs follow_up_changed and updated fields', async () => {
    const { a, c } = await newContact();
    await a.client
      .from('contacts')
      .update({ follow_up_on: '2026-12-01' })
      .eq('id', c.id);
    await a.client.from('contacts').update({ summary: 'hi' }).eq('id', c.id);
    const rows = await activities(c.id);
    expect(rows.map((r) => r.type)).toEqual([
      'created',
      'follow_up_changed',
      'updated',
    ]);
    expect(rows[1]?.payload).toEqual({ from: null, to: '2026-12-01' });
    expect(rows[2]?.payload).toEqual({ fields: ['summary'] });
  });

  it('advances updated_at and sets updated_by on every update', async () => {
    const { a, c } = await newContact();
    let prev = '';
    for (const summary of ['a', 'b']) {
      const { data } = await a.client
        .from('contacts')
        .update({ summary })
        .eq('id', c.id)
        .select()
        .single();
      expect(data.updated_by).toBe(a.userId);
      expect(data.updated_at > prev).toBe(true);
      prev = data.updated_at;
    }
  });

  it('admin can soft-delete and restore; both are logged', async () => {
    const { a, c } = await newContact();
    const del = await a.client
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', c.id);
    expect(del.error).toBeNull();
    const res = await a.client
      .from('contacts')
      .update({ deleted_at: null })
      .eq('id', c.id);
    expect(res.error).toBeNull();
    expect((await activities(c.id)).map((r) => r.type)).toEqual([
      'created',
      'deleted',
      'restored',
    ]);
  });

  it('viewer cannot soft-delete', async () => {
    const { c } = await newContact();
    const v = await viewerClient();
    const r = await v.client
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', c.id)
      .select();
    expect(r.data ?? []).toHaveLength(0);
    const row = await serviceClient()
      .from('contacts')
      .select('deleted_at')
      .eq('id', c.id)
      .single();
    expect(row.data?.deleted_at).toBeNull();
    expect((await activities(c.id)).map((r) => r.type)).toEqual(['created']);
  });

  it('logs note_added', async () => {
    const { a, c } = await newContact();
    const { error } = await a.client.from('notes').insert({
      contact_id: c.id,
      body: 'called',
      body_json: docFromText('called'),
      author_id: a.userId,
    });
    expect(error).toBeNull();
    const rows = await activities(c.id);
    expect(rows.at(-1)).toMatchObject({
      type: 'note_added',
      actor_id: a.userId,
    });
  });

  it('writes no activities when caseflow.seeding is on', async () => {
    const id = await rpc<string>(serviceClient(), 'seed_insert_contact', {
      c: {
        full_name: 'Seeded Person',
        phone: '5125550199',
        matter_type: 'family',
      },
    });
    expect(await activities(id)).toHaveLength(0);
  });

  it('seeding keeps a backdated created_at', async () => {
    const svc = serviceClient();
    const id = await rpc<string>(svc, 'seed_insert_contact', {
      c: {
        full_name: 'Old Timer',
        phone: '5125550197',
        matter_type: 'family',
        created_at: '2024-03-01T12:00:00Z',
      },
    });
    const { data } = await svc
      .from('contacts')
      .select('created_at')
      .eq('id', id)
      .single();
    expect(new Date(data?.created_at).toISOString()).toBe(
      '2024-03-01T12:00:00.000Z',
    );
  });

  it('seeding keeps a backdated updated_at; a signed-in insert gets now()', async () => {
    const svc = serviceClient();
    const id = await rpc<string>(svc, 'seed_insert_contact', {
      c: {
        full_name: 'Old Timer',
        phone: '5125550196',
        matter_type: 'family',
        updated_at: '2024-03-02T12:00:00Z',
      },
    });
    const { data } = await svc
      .from('contacts')
      .select('updated_at')
      .eq('id', id)
      .single();
    expect(new Date(data?.updated_at).toISOString()).toBe(
      '2024-03-02T12:00:00.000Z',
    );

    const a = await adminClient();
    const { data: c } = await seedContact(a.client, {
      full_name: 'Fresh One',
      phone: '5125550195',
      updated_at: '2001-01-01T00:00:00Z',
    });
    expect(new Date(c.updated_at).getFullYear()).toBeGreaterThan(2020);
  });

  it('delete guard rejects a caller without contacts.delete', async () => {
    const { c } = await newContact();
    // service role has no auth.uid(), so has_permission is false and RLS is bypassed
    const r = await serviceClient()
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', c.id);
    expect(r.error?.message).toBe('forbidden: contacts.delete');
    expect(r.error?.code).toBe('42501');
  });

  it('authenticated clients cannot call seed_insert_contact', async () => {
    const a = await adminClient();
    const r = await a.client.rpc('seed_insert_contact', {
      c: {
        full_name: 'Sneaky Seed',
        phone: '5125550198',
        matter_type: 'family',
      },
    });
    expect(r.error?.code).toBe('42501');
  });

  it('signed-in writes are logged (cannot prove the seeding guard: no pg client)', async () => {
    const { a, c } = await newContact();
    await a.client.from('notes').insert({
      contact_id: c.id,
      body: 'x',
      body_json: docFromText('x'),
      author_id: a.userId,
    });
    expect((await activities(c.id)).map((r) => r.type)).toEqual([
      'created',
      'note_added',
    ]);
  });

  it('forged audit fields on update are overridden', async () => {
    const { a, c } = await newContact();
    const { data } = await a.client
      .from('contacts')
      .update({
        summary: 's',
        created_by: (await viewerClient()).userId,
        created_at: '2001-01-01T00:00:00Z',
        updated_by: null,
        updated_at: '2001-01-01T00:00:00Z',
      })
      .eq('id', c.id)
      .select()
      .single();
    expect(data.created_by).toBe(a.userId);
    expect(new Date(data.created_at).getFullYear()).toBeGreaterThan(2020);
    expect(data.updated_by).toBe(a.userId);
    expect(new Date(data.updated_at).getFullYear()).toBeGreaterThan(2020);
  });
});
