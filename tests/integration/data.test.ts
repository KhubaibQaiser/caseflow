import { docFromText } from '@/lib/contracts/rich-text';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let current: SupabaseClient | null = null;
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => current,
}));
vi.mock('@/lib/dates/server', () => ({
  getRequestTimeZone: async () => 'UTC',
}));
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({ redirect }));

import {
  assertPermission,
  getViewer,
  NoProfileError,
  requirePermission,
} from '@/lib/auth/viewer-supabase';
import { ContactRowSchema } from '@/lib/contracts/contact';
import { toFilters, type ListQuery } from '@/lib/contracts/list-query';
import {
  getContact,
  getContactFacets,
  getPipelineColumn,
  searchContacts,
} from '@/lib/data/supabase';
import { addDaysDateOnly, todayIn } from '@/lib/dates/date-only';
import {
  adminClient,
  anonClient,
  anonSignedIn,
  PASSWORD,
  resetData,
  serviceClient,
  viewerClient,
} from './setup';

const today = todayIn('UTC');
const q = (o: Partial<ListQuery> = {}): ListQuery =>
  ({
    q: null,
    status: null,
    matter: null,
    source: null,
    fu: null,
    fuFrom: null,
    fuTo: null,
    createdFrom: null,
    createdTo: null,
    sort: 'follow_up',
    dir: 'asc',
    page: 1,
    size: 25,
    ...o,
  }) as ListQuery;

async function seed(c: Record<string, unknown>): Promise<string> {
  const { data, error } = await serviceClient().rpc('seed_insert_contact', {
    c: { matter_type: 'family', phone: '5125550100', ...c },
  });
  if (error) throw new Error(error.message);
  return data as string;
}

let adminId: string;
beforeEach(async () => {
  redirect.mockClear();
  await resetData();
  const a = await adminClient();
  current = a.client;
  adminId = a.userId;
});

describe('data layer against the local stack', () => {
  it('searchContacts returns rows that parse with ContactRowSchema', async () => {
    await seed({
      full_name: 'Late One',
      follow_up_on: addDaysDateOnly(today, -3),
    });
    await seed({ full_name: 'No Date' });
    const r = await searchContacts(q());
    expect(r.total).toBe(2);
    expect(r.rows.map((x) => x.fullName)).toEqual(['Late One', 'No Date']);
    for (const row of r.rows) ContactRowSchema.parse(row);
    expect(r.rows[0]?.daysOverdue).toBe(3);
  });

  it('getContactFacets returns validated counts', async () => {
    await seed({ full_name: 'A One', status: 'active' });
    const f = await getContactFacets(toFilters(q()));
    expect(f.total).toBe(1);
    expect(f.facets.status.active).toBe(1);
  });

  it('getPipelineColumn pages by offset and reports matching', async () => {
    for (let i = 0; i < 26; i++)
      await seed({ full_name: `Lead ${i}x`, status: 'lead' });
    await seed({ full_name: 'Done One', status: 'closed' });
    const a = await getPipelineColumn('lead', {}, 0, 25);
    expect(a.matching).toBe(26);
    expect(a.rows).toHaveLength(25);
    expect(await getPipelineColumn('lead', {}, 25, 25)).toMatchObject({
      rows: [expect.anything()],
    });
    expect((await getPipelineColumn('lead', {}, 50, 25)).rows).toHaveLength(0);
  });

  it('getContact joins authors and actors, newest first, and hides deleted rows', async () => {
    const id = await seed({ full_name: 'Detail Case', summary: 'Hello' });
    const admin = current as SupabaseClient;
    await admin.from('notes').insert([
      {
        contact_id: id,
        author_id: adminId,
        body: 'first',
        body_json: docFromText('first'),
      },
    ]);
    await admin.from('notes').insert([
      {
        contact_id: id,
        author_id: adminId,
        body: 'second',
        body_json: docFromText('second'),
      },
    ]);
    const d = await getContact(id);
    expect(d?.summary).toBe('Hello');
    expect(d?.notes.map((n) => n.body)).toEqual(['second', 'first']);
    expect(d?.notes[0]?.author).toEqual({ name: 'IT Admin', role: 'admin' });
    expect(
      d?.activities.every((a) => a.type !== 'deleted' && a.type !== 'restored'),
    ).toBe(true);

    const del = await admin
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    expect(del.error).toBeNull();
    expect(await getContact(id)).toBeNull();

    await admin.from('contacts').update({ deleted_at: null }).eq('id', id);
    const back = await getContact(id);
    expect(back?.activities.length).toBeGreaterThan(0);
    expect(back?.activities.map((a) => a.type)).not.toContain('restored');
  });

  it('getContact returns null for a missing id', async () => {
    expect(await getContact('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});

describe('getViewer and permissions', () => {
  it('reads the verified viewer with permissions', async () => {
    const v = await getViewer();
    expect(v).toMatchObject({
      id: adminId,
      displayName: 'IT Admin',
      role: 'admin',
    });
    expect(v?.permissions).toContain('contacts.write');
  });

  it('returns null with no session', async () => {
    current = anonClient();
    expect(await getViewer()).toBeNull();
  });

  it('assertPermission returns forbidden for a viewer and unauthorized for none', async () => {
    current = (await viewerClient()).client;
    const r = await assertPermission('contacts.write');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('forbidden');
    expect((await assertPermission('contacts.read')).ok).toBe(true);
    current = anonClient();
    const u = await assertPermission('contacts.read');
    if (!u.ok) expect(u.error.code).toBe('unauthorized');
    expect(u.ok).toBe(false);
  });

  it('requirePermission redirects with no session and throws ForbiddenError without the permission', async () => {
    current = anonClient();
    await expect(requirePermission('contacts.read')).rejects.toThrow(
      'REDIRECT /login?reason=expired',
    );
    current = (await viewerClient()).client;
    await expect(requirePermission('contacts.write')).rejects.toMatchObject({
      name: 'ForbiddenError',
    });
  });
});

describe('viewer edge cases', () => {
  it('signed in without a profile throws NoProfileError and never redirects', async () => {
    const svc = serviceClient();
    const made = await svc.auth.admin.createUser({
      email: 'it-noprofile@caseflow.test',
      password: PASSWORD,
      email_confirm: true,
    });
    if (made.error && !/already/i.test(made.error.message)) throw made.error;
    current = await anonSignedIn('it-noprofile@caseflow.test');
    await expect(getViewer()).rejects.toBeInstanceOf(NoProfileError);
    await expect(requirePermission('contacts.read')).rejects.toBeInstanceOf(
      NoProfileError,
    );
    const r = await assertPermission('contacts.read');
    expect(r.ok).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('throws (not null) when the profiles query errors', async () => {
    current = {
      auth: { getClaims: async () => ({ data: { claims: { sub: 'u' } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: null,
              error: { message: 'boom' },
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    await expect(getViewer()).rejects.toThrow(/profile/i);
  });
});

describe('data layer as a viewer', () => {
  it('reads contacts and details read-only', async () => {
    const id = await seed({ full_name: 'Read Only' });
    current = (await viewerClient()).client;
    expect((await searchContacts(q())).rows).toHaveLength(1);
    expect((await getContact(id))?.fullName).toBe('Read Only');
  });
});
