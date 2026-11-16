import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  STATUSES,
  MATTER_TYPES,
  REFERRAL_SOURCES,
} from '@/lib/contracts/enums';
import type { Filters } from '@/lib/contracts/list-query';
import { addDaysDateOnly, todayIn } from '@/lib/dates/date-only';
import {
  adminClient,
  anonClient,
  resetData,
  rpc,
  serviceClient,
  viewerClient,
} from './setup';

type Row = {
  id: string;
  full_name: string;
  urgency: string;
  days_overdue: number | null;
};
type Search = { rows: Row[]; total: number; matching: number };
type Facets = {
  total: number;
  matching: number;
  quickViews: { all: number; overdue: number; dueToday: number };
  facets: {
    status: Record<string, number>;
    matterType: Record<string, number>;
    referralSource: Record<string, number>;
    followUp: Record<string, number>;
  };
};

const today = () => todayIn('UTC');
const off = (n: number) => addDaysDateOnly(today(), n);
const pad = (n: number) => String(n).padStart(2, '0');

async function seed(c: Record<string, unknown>): Promise<string> {
  const { data, error } = await serviceClient().rpc('seed_insert_contact', {
    c: { matter_type: 'family', phone: '5125550100', ...c },
  });
  if (error) throw new Error(error.message);
  return data as string;
}

const NAMES = [
  'Morgan Hale',
  'Ana Ruiz',
  'Dev Patel',
  'Lena Ford',
  'Omar Said',
];
const FU = [-5, -1, 0, 1, 3, 6, 7, 10, null, null];

// 40 deterministic contacts; i=38 has phone (512) 555-0148.
async function seedMany() {
  for (let i = 0; i < 40; i++) {
    const fu = FU[i % FU.length];
    await seed({
      full_name: `${NAMES[i % 5]} ${i}`,
      email: i % 4 === 0 ? `p${i}@example.com` : null,
      phone: `(512) 555-01${pad(i + 10)}`,
      status: STATUSES[i % 3],
      matter_type: MATTER_TYPES[i % 6],
      referral_source: i % 5 === 4 ? null : REFERRAL_SOURCES[i % 5],
      follow_up_on: fu === null || fu === undefined ? null : off(fu),
      created_at: i < 10 ? '2020-01-15T12:00:00Z' : undefined,
    });
  }
}

const search = (
  client: SupabaseClient,
  f: Filters | Record<string, unknown>,
  o: Record<string, unknown> = {},
) =>
  rpc<Search>(client, 'search_contacts', {
    f,
    sort: 'follow_up',
    dir: 'asc',
    page: 1,
    page_size: 25,
    tz: 'UTC',
    ...o,
  });
const facets = (client: SupabaseClient, f: Filters = {}, tz = 'UTC') =>
  rpc<Facets>(client, 'contact_facets', { f, tz });

let admin: SupabaseClient;
beforeEach(async () => {
  await resetData();
  admin = (await adminClient()).client;
});

const FILTER_CASES: [string, Filters][] = [
  ['empty', {}],
  ['lead', { status: ['lead'] }],
  ['overdue lead+active', { status: ['lead', 'active'], followUp: 'overdue' }],
  ['family + q', { matterType: ['family'], q: 'or' }],
  ['none', { followUp: 'none' }],
  ['created range', { createdFrom: '2020-01-01', createdTo: '2020-12-31' }],
  ['next7Days', { followUp: 'next7Days' }],
  ['custom', { followUp: 'custom', followUpFrom: off(0), followUpTo: off(3) }],
  ['source', { referralSource: ['google_search', 'past_client'] }],
];

describe('search_contacts and contact_facets', () => {
  it.each(FILTER_CASES)('facets agree with search totals: %s', async (_, f) => {
    await seedMany();
    const s = await search(admin, f);
    const fc = await facets(admin, f);
    const sel: readonly string[] = f.status ?? STATUSES;
    expect(fc.matching).toBe(s.matching);
    expect(fc.total).toBe(s.total);
    expect(sel.reduce((n, k) => n + (fc.facets.status[k] ?? 0), 0)).toBe(
      s.matching,
    );
    expect(s.rows.length).toBe(Math.min(25, s.matching));
  });

  it('matches known counts', async () => {
    await seedMany();
    expect((await search(admin, {})).matching).toBe(40);
    expect(
      (
        await search(admin, {
          createdFrom: '2020-01-01',
          createdTo: '2020-12-31',
        })
      ).matching,
    ).toBe(10);
    expect((await search(admin, { followUp: 'none' })).matching).toBe(8);
  });

  it('orders overdue, today, soonest open, soonest closed, then none', async () => {
    const ids = {
      a: await seed({
        full_name: 'A Overdue3',
        status: 'lead',
        follow_up_on: off(-3),
      }),
      b: await seed({
        full_name: 'B Overdue1',
        status: 'active',
        follow_up_on: off(-1),
      }),
      c: await seed({
        full_name: 'C Today',
        status: 'lead',
        follow_up_on: off(0),
      }),
      j: await seed({
        full_name: 'J Soon',
        status: 'lead',
        follow_up_on: off(2),
        updated_at: '2026-06-02T00:00:00Z',
      }),
      e: await seed({
        full_name: 'E Soon',
        status: 'active',
        follow_up_on: off(2),
        updated_at: '2026-06-01T00:00:00Z',
      }),
      f: await seed({
        full_name: 'F Later',
        status: 'lead',
        follow_up_on: off(5),
      }),
      d: await seed({
        full_name: 'D ClosedPast',
        status: 'closed',
        follow_up_on: off(-2),
      }),
      g: await seed({
        full_name: 'G ClosedSoon',
        status: 'closed',
        follow_up_on: off(1),
      }),
      h: await seed({
        full_name: 'H None',
        status: 'lead',
        updated_at: '2026-06-02T00:00:00Z',
      }),
      i: await seed({
        full_name: 'I None',
        status: 'closed',
        updated_at: '2026-06-01T00:00:00Z',
      }),
    };
    const asc = await search(admin, {});
    expect(asc.rows.map((r) => r.id)).toEqual([
      ids.a,
      ids.b,
      ids.c,
      ids.j,
      ids.e,
      ids.f,
      ids.d,
      ids.g,
      ids.h,
      ids.i,
    ]);
    const desc = await search(admin, {}, { dir: 'desc' });
    expect(desc.rows.map((r) => r.id)).toEqual([
      ids.h,
      ids.i,
      ids.g,
      ids.d,
      ids.f,
      ids.j,
      ids.e,
      ids.c,
      ids.b,
      ids.a,
    ]);
    const urg = Object.fromEntries(asc.rows.map((r) => [r.id, r]));
    expect(urg[ids.a]).toMatchObject({ urgency: 'overdue', days_overdue: 3 });
    expect(urg[ids.c]).toMatchObject({ urgency: 'today', days_overdue: null });
    expect(urg[ids.d]).toMatchObject({ urgency: 'later', days_overdue: null });
    expect(urg[ids.h]).toMatchObject({ urgency: 'none' });
  });

  it('closed contacts with past dates are not overdue or due today', async () => {
    await seed({
      full_name: 'Closed Past',
      status: 'closed',
      follow_up_on: off(-4),
    });
    await seed({
      full_name: 'Closed Today',
      status: 'closed',
      follow_up_on: off(0),
    });
    await seed({
      full_name: 'Open Past',
      status: 'lead',
      follow_up_on: off(-4),
    });
    expect((await search(admin, { followUp: 'overdue' })).matching).toBe(1);
    expect((await search(admin, { followUp: 'dueToday' })).matching).toBe(0);
    const fc = await facets(admin);
    expect(fc.quickViews).toEqual({ all: 3, overdue: 1, dueToday: 0 });
  });

  it('next7Days is half-open and includes closed; none includes closed', async () => {
    await seed({ full_name: 'Day Zero', follow_up_on: off(0) });
    await seed({
      full_name: 'Day Six Closed',
      status: 'closed',
      follow_up_on: off(6),
    });
    await seed({ full_name: 'Day Seven', follow_up_on: off(7) });
    await seed({ full_name: 'Yesterday', follow_up_on: off(-1) });
    await seed({ full_name: 'No Date Closed', status: 'closed' });
    const names = async (f: Filters) =>
      (await search(admin, f)).rows.map((r) => r.full_name).sort();
    expect(await names({ followUp: 'next7Days' })).toEqual([
      'Day Six Closed',
      'Day Zero',
    ]);
    expect(await names({ followUp: 'none' })).toEqual(['No Date Closed']);
    expect(await names({ followUp: 'custom', followUpTo: off(0) })).toEqual([
      'Day Zero',
      'Yesterday',
    ]);
  });

  it('phone search matches digits typed without formatting; q is substring on name/email/summary', async () => {
    await seed({ full_name: 'Phone Person', phone: '(512) 555-0148' });
    await seed({
      full_name: 'Other',
      phone: '(512) 555-0199',
      email: 'Zed@Example.com',
      summary: 'Needs a Guardian',
    });
    const names = async (q: string) =>
      (await search(admin, { q })).rows.map((r) => r.full_name);
    expect(await names('5550148')).toEqual(['Phone Person']);
    expect(await names('55')).toEqual([]); // under 3 digits: no phone match
    expect(await names('zed@exam')).toEqual(['Other']);
    expect(await names('guardian')).toEqual(['Other']);
    expect(await names('%')).toEqual([]); // not a wildcard
  });

  it('facets leave out their own group but apply the others', async () => {
    await seed({ full_name: 'L1', status: 'lead', matter_type: 'family' });
    await seed({ full_name: 'L2', status: 'lead', matter_type: 'immigration' });
    await seed({ full_name: 'A1', status: 'active', matter_type: 'family' });
    const fc = await facets(admin, {
      status: ['lead'],
      matterType: ['family'],
    });
    expect(fc.matching).toBe(1);
    expect(fc.facets.status).toEqual({ lead: 1, active: 1, closed: 0 });
    expect(fc.facets.matterType.family).toBe(1);
    expect(fc.facets.matterType.immigration).toBe(1);
  });

  it('excludes soft-deleted contacts everywhere', async () => {
    const id = await seed({ full_name: 'Gone Soon' });
    await seed({ full_name: 'Stays' });
    const { error } = await admin
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    expect(error).toBeNull();
    const s = await search(admin, {});
    expect(s).toMatchObject({ total: 1, matching: 1 });
    expect((await facets(admin)).total).toBe(1);
  });

  it('today differs by zone', async () => {
    const kiri = todayIn('Pacific/Kiritimati');
    await seed({ full_name: 'Kiri Day', follow_up_on: kiri });
    const there = await search(admin, {}, { tz: 'Pacific/Kiritimati' });
    const here = await search(admin, {}, { tz: 'Pacific/Pago_Pago' });
    expect(there.rows[0]?.urgency).toBe('today');
    expect(here.rows[0]?.urgency).toBe('later');
    expect(
      (await facets(admin, {}, 'Pacific/Kiritimati')).quickViews.dueToday,
    ).toBe(1);
  });

  it('created filter compares the tz-local date', async () => {
    await seed({ full_name: 'Late UTC', created_at: '2026-03-10T23:30:00Z' });
    const f = { createdFrom: '2026-03-11', createdTo: '2026-03-11' };
    expect((await search(admin, f, { tz: 'UTC' })).matching).toBe(0);
    expect((await search(admin, f, { tz: 'Asia/Tokyo' })).matching).toBe(1);
  });

  it('invalid tz falls back to UTC; bad input never errors', async () => {
    await seed({ full_name: 'Row One', follow_up_on: off(0) });
    expect(
      (await search(admin, {}, { tz: 'Mars/Base' })).rows[0]?.urgency,
    ).toBe('today');
    expect((await facets(admin, {}, 'Mars/Base')).quickViews.dueToday).toBe(1);
    const junk: Record<string, unknown> = {
      status: 'lead',
      matterType: ['nope'],
      followUp: 'bogus',
      followUpFrom: '2026-02-31',
      createdFrom: 'not-a-date',
      q: 5,
    };
    const s = await search(admin, junk, {
      sort: 'drop table',
      dir: 'sideways',
      page_size: 7,
    });
    expect(s.total).toBe(1);
    await expect(facets(admin, junk as Filters)).resolves.toMatchObject({
      total: 1,
    });
    expect((await search(admin, null as unknown as Filters)).total).toBe(1);
  });

  it('clamps page size and out-of-range pages', async () => {
    await seedMany();
    const last = await search(admin, {}, { page: 99, page_size: 25 });
    expect(last.rows).toHaveLength(15); // page 2 of 25
    const bad = await search(admin, {}, { page: 0, page_size: 7 });
    expect(bad.rows).toHaveLength(40); // 7 -> default 250
  });

  it('sorts by the whitelisted keys', async () => {
    await seed({ full_name: 'Bea', status: 'closed' });
    await seed({ full_name: 'Abe', status: 'lead' });
    const by = async (sort: string, dir = 'asc') =>
      (await search(admin, {}, { sort, dir })).rows.map((r) => r.full_name);
    expect(await by('name')).toEqual(['Abe', 'Bea']);
    expect(await by('name', 'desc')).toEqual(['Bea', 'Abe']);
    expect(await by('status')).toEqual(['Abe', 'Bea']);
    expect(await by('waiting')).toHaveLength(2);
    expect(await by('updated')).toHaveLength(2);
  });

  it('viewer can call the RPCs; anon cannot call them but can ping', async () => {
    await seed({ full_name: 'Visible One' });
    const v = (await viewerClient()).client;
    expect((await search(v, {})).matching).toBe(1);
    expect((await facets(v)).total).toBe(1);
    const anon = anonClient();
    expect((await anon.rpc('search_contacts', { f: {} })).error).not.toBeNull();
    expect((await anon.rpc('contact_facets', { f: {} })).error).not.toBeNull();
    expect(await rpc(anon, 'ping')).toBe(true);
  });
});
