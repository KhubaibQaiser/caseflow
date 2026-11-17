import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// Tests supply the time zone explicitly instead of relying on a request.
const tzRef = vi.hoisted(() => ({ tz: 'UTC' }));
vi.mock('@/lib/dates/server', () => ({
  getRequestTimeZone: async () => tzRef.tz,
}));
import { ContactRowSchema, type ContactRow } from '@/lib/contracts/contact';
import { loadListQuery, type ListQuery } from '@/lib/contracts/list-query';
import { ContactFacetsSchema } from '@/lib/contracts/facets';
import { addDaysDateOnly } from '@/lib/dates/date-only';
import { makeFixtureRows } from './fixtures';
import {
  getContact,
  getContactFacets,
  getPipelineColumn,
  searchContacts,
} from './fake';

const q = (over: Partial<ListQuery>): ListQuery => ({
  ...loadListQuery(''),
  ...over,
});

describe('fake data layer', () => {
  it('searchContacts: lead rows, max 25, urgency order', async () => {
    const r = await searchContacts(
      q({ status: ['lead'], page: 1, size: 25, sort: 'follow_up' }),
    );
    expect(r.rows.length).toBeLessThanOrEqual(25);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.every((x) => x.status === 'lead')).toBe(true);
    const rank = (x: (typeof r.rows)[number]) =>
      x.urgency === 'overdue'
        ? 0
        : x.urgency === 'today'
          ? 1
          : x.followUpOn
            ? 2
            : 3;
    const ranks = r.rows.map(rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(r.matching).toBeGreaterThanOrEqual(r.rows.length);
    expect(r.total).toBeGreaterThanOrEqual(r.matching);
  });

  it('facets: status group ignores its own filter', async () => {
    const f = await getContactFacets({ status: ['lead'] });
    expect(ContactFacetsSchema.safeParse(f).success).toBe(true);
    expect(f.facets.status.active).toBeGreaterThan(0);
    expect(f.matching).toBe(f.facets.status.lead);
  });

  it('pipeline column and detail', async () => {
    const col = await getPipelineColumn('active', {}, 0, 50);
    expect(col.rows.length).toBeLessThanOrEqual(50);
    expect(col.rows.every((x) => x.status === 'active')).toBe(true);
    const id = col.rows[0]?.id ?? '';
    const d = await getContact(id);
    expect(id).not.toBe('');
    expect(d?.id).toBe(id);
    expect(await getContact('nope')).toBeNull();
  });

  it('detail: even ids have notes, odd ids none; activity is newest first and ends at creation', async () => {
    const even = await getContact('c-00002');
    const odd = await getContact('c-00001');
    expect(even?.notes).toHaveLength(2);
    expect(odd?.notes).toHaveLength(0);
    const stamps = even?.activities.map((a) => a.createdAt) ?? [];
    expect(stamps).toEqual([...stamps].sort().reverse());
    expect(even?.activities.at(-1)?.type).toBe('created');
  });

  it('clamps out-of-range page', async () => {
    const r = await searchContacts(
      q({ status: ['lead'], page: 9999, size: 25 }),
    );
    expect(r.rows.length).toBeGreaterThan(0);
  });

  it('closed rows are never overdue/today: dated is later, undated is none', async () => {
    const r = await searchContacts(q({ status: ['closed'], size: 500 }));
    const dated = r.rows.filter((x) => x.followUpOn);
    expect(dated.length).toBeGreaterThan(0);
    expect(dated.every((x) => x.urgency === 'later')).toBe(true);
    expect(
      r.rows.filter((x) => !x.followUpOn).every((x) => x.urgency === 'none'),
    ).toBe(true);
  });
});

describe('fake data layer at a fixed instant', () => {
  const T = '2026-11-16';
  const ids = (r: { rows: ContactRow[] }) => r.rows.map((x) => x.id);

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-16T20:00:00Z'));
  });
  afterAll(() => vi.useRealTimers());
  afterEach(() => {
    tzRef.tz = 'UTC';
  });

  it('fixture rows match the row contract and are never in the future', () => {
    const rows = ContactRowSchema.array().parse(makeFixtureRows(1200, T));
    // UTC+14 is the first zone to reach T, at T-1 10:00Z.
    const earliestNow = Date.parse(`${addDaysDateOnly(T, -1)}T10:00:00Z`);
    const bad = rows.filter(
      (r) =>
        !(Date.parse(r.updatedAt) >= Date.parse(r.createdAt)) ||
        !(Date.parse(r.updatedAt) <= earliestNow),
    );
    expect(bad.map((r) => [r.createdAt, r.updatedAt])).toEqual([]);
  });

  it('next7Days is today through today+6', async () => {
    const r = await searchContacts(q({ fu: 'next7Days', size: 500 }));
    const end = addDaysDateOnly(T, 7);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(
      r.rows.filter(
        (x) => x.followUpOn === null || x.followUpOn < T || x.followUpOn >= end,
      ),
    ).toEqual([]);
    const f = await getContactFacets({});
    expect(f.facets.followUp.next7Days).toBe(r.matching);
  });

  it('search matches phone digits typed without formatting', async () => {
    const all = await searchContacts(q({ size: 500 }));
    const target = all.rows.find((x) => x.phone)!;
    const digits = target.phone!.replace(/\D/g, '').slice(3); // 5550148 for (512) 555-0148
    const r = await searchContacts(q({ q: digits, size: 500 }));
    expect(ids(r)).toContain(target.id);
  });

  it('search is case-insensitive on name, email and summary', async () => {
    const all = await searchContacts(q({ size: 500 }));
    const t = all.rows.find((x) => x.email)!;
    expect(
      ids(await searchContacts(q({ q: t.fullName.toUpperCase(), size: 500 }))),
    ).toContain(t.id);
    expect(
      ids(await searchContacts(q({ q: t.email!.toUpperCase(), size: 500 }))),
    ).toContain(t.id);
    // The fake's summary is "Intake for <name>."
    const s = await searchContacts(q({ q: 'INTAKE FOR', size: 25 }));
    expect(s.matching).toBe(s.total);
  });

  it("created range uses the viewer's local date", async () => {
    tzRef.tz = 'America/Los_Angeles';
    const all = await searchContacts(q({ size: 500, sort: 'waiting' }));
    // Before 07:00Z is still the previous day in Los Angeles (UTC-7 or UTC-8).
    const target = all.rows.find(
      (x) => new Date(x.createdAt).getUTCHours() < 7,
    )!;
    const utcDate = target.createdAt.slice(0, 10);
    const local = addDaysDateOnly(utcDate, -1);
    const onLocal = await searchContacts(
      q({ createdFrom: local, createdTo: local, size: 500 }),
    );
    expect(ids(onLocal)).toContain(target.id);
    const onUtc = await searchContacts(
      q({ createdFrom: utcDate, createdTo: utcDate, size: 500 }),
    );
    expect(ids(onUtc)).not.toContain(target.id);
  });

  it('follow_up sort: overdue, today, open dated, closed dated, none', async () => {
    const rank = (x: ContactRow) =>
      x.urgency === 'overdue'
        ? 0
        : x.urgency === 'today'
          ? 1
          : x.followUpOn === null
            ? 4
            : x.status === 'closed'
              ? 3
              : 2;
    const rows: ContactRow[] = [];
    for (let page = 1; page <= 3; page++)
      rows.push(...(await searchContacts(q({ size: 500, page }))).rows);
    expect(rows.length).toBe(1200);
    const bad: string[] = [];
    rows.forEach((b, i) => {
      const a = rows[i - 1];
      if (!a) return;
      const ok =
        rank(a) < rank(b) ||
        (rank(a) === rank(b) &&
          (a.followUpOn !== b.followUpOn
            ? (a.followUpOn ?? '') < (b.followUpOn ?? '')
            : a.updatedAt >= b.updatedAt));
      if (!ok)
        bad.push(
          `${i}: ${a.status} ${a.followUpOn} > ${b.status} ${b.followUpOn}`,
        );
    });
    expect(bad).toEqual([]);
  });
});
