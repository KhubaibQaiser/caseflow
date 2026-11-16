import 'server-only';
import type { ContactDetail, ContactRow } from '@/lib/contracts/contact';
import {
  FOLLOW_UP_FILTERS,
  MATTER_TYPES,
  REFERRAL_SOURCES,
  STATUSES,
  type Status,
} from '@/lib/contracts/enums';
import type { ContactFacets } from '@/lib/contracts/facets';
import {
  clampPage,
  toFilters,
  type Filters,
  type ListQuery,
} from '@/lib/contracts/list-query';
import { addDaysDateOnly, todayIn } from '@/lib/dates/date-only';
import { getRequestTimeZone } from '@/lib/dates/server';
import { makeFixtureRows } from './fixtures';

const FIXTURE_COUNT = 1200;
const cache = new Map<string, ContactRow[]>();

// "Today" in the request time zone. No catch: cookies() signals dynamic rendering to Next.
async function load(): Promise<{
  rows: ContactRow[];
  today: string;
  tz: string;
}> {
  const tz = await getRequestTimeZone();
  const t = todayIn(tz);
  let rows = cache.get(t);
  if (!rows) {
    cache.clear();
    rows = makeFixtureRows(FIXTURE_COUNT, t);
    cache.set(t, rows);
  }
  return { rows, today: t, tz };
}

// The fake has no stored summary; getContact returns this one.
const summaryOf = (r: ContactRow) => `Intake for ${r.fullName}.`;

type Group =
  'status' | 'matterType' | 'referralSource' | 'followUp' | 'created';

function followUpBucket(
  r: ContactRow,
  f: Filters['followUp'],
  t: string,
  from?: string,
  to?: string,
): boolean {
  const open = r.status !== 'closed';
  const d = r.followUpOn;
  switch (f) {
    case 'overdue':
      return open && d !== null && d < t;
    case 'dueToday':
      return open && d === t;
    case 'next7Days':
      return d !== null && d >= t && d < addDaysDateOnly(t, 7);
    case 'none':
      return d === null;
    case 'custom':
    default:
      return d !== null && (!from || d >= from) && (!to || d <= to);
  }
}

// Does the row pass every group except those in `skip`? `q` always applies.
function matches(
  r: ContactRow,
  f: Filters,
  t: string,
  tz: string,
  skip?: Group,
): boolean {
  if (f.q) {
    const q = f.q.toLowerCase();
    const digits = q.replace(/\D/g, '');
    const text = [r.fullName, r.email, summaryOf(r)].some((v) =>
      v?.toLowerCase().includes(q),
    );
    const phone =
      digits.length >= 3 && !!r.phone?.replace(/\D/g, '').includes(digits);
    if (!text && !phone) return false;
  }
  if (skip !== 'status' && f.status?.length && !f.status.includes(r.status))
    return false;
  if (
    skip !== 'matterType' &&
    f.matterType?.length &&
    !f.matterType.includes(r.matterType)
  )
    return false;
  if (
    skip !== 'referralSource' &&
    f.referralSource?.length &&
    !(r.referralSource && f.referralSource.includes(r.referralSource))
  )
    return false;
  if (skip !== 'followUp') {
    if (f.followUp && f.followUp !== 'custom') {
      if (!followUpBucket(r, f.followUp, t)) return false;
    } else if (
      (f.followUp === 'custom' || f.followUpFrom || f.followUpTo) &&
      !followUpBucket(r, 'custom', t, f.followUpFrom, f.followUpTo)
    )
      return false;
  }
  if (skip !== 'created') {
    const c = todayIn(tz, new Date(r.createdAt));
    if (f.createdFrom && c < f.createdFrom) return false;
    if (f.createdTo && c > f.createdTo) return false;
  }
  return true;
}

// Overdue, due today, open dated, closed dated, then no follow-up.
const urgencyRank = (r: ContactRow) =>
  r.urgency === 'overdue'
    ? 0
    : r.urgency === 'today'
      ? 1
      : r.followUpOn === null
        ? 4
        : r.status === 'closed'
          ? 3
          : 2;

function compare(sort: ListQuery['sort'], dir: ListQuery['dir']) {
  const sign = dir === 'desc' ? -1 : 1;
  const byUpdated = (a: ContactRow, b: ContactRow) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0;
  return (a: ContactRow, b: ContactRow): number => {
    let c = 0;
    switch (sort) {
      case 'follow_up':
        c = urgencyRank(a) - urgencyRank(b);
        // Within overdue the oldest date comes first; later dates ascend too.
        if (c === 0 && a.followUpOn && b.followUpOn)
          c =
            a.followUpOn < b.followUpOn
              ? -1
              : a.followUpOn > b.followUpOn
                ? 1
                : 0;
        break;
      case 'name':
        c = a.fullName.localeCompare(b.fullName);
        break;
      case 'waiting':
        c = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
        break;
      case 'updated':
        c = a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0;
        break;
      case 'status':
        c = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
        break;
    }
    return c !== 0 ? c * sign : byUpdated(a, b);
  };
}

export async function searchContacts(
  q: ListQuery,
): Promise<{ rows: ContactRow[]; total: number; matching: number }> {
  const { rows, today: t, tz } = await load();
  const f = toFilters(q);
  const hit = rows
    .filter((r) => matches(r, f, t, tz))
    .sort(compare(q.sort, q.dir));
  const page = clampPage(q.page, hit.length, q.size);
  return {
    rows: hit.slice((page - 1) * q.size, page * q.size),
    total: rows.length,
    matching: hit.length,
  };
}

const zero = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export async function getContactFacets(f: Filters): Promise<ContactFacets> {
  const { rows, today: t, tz } = await load();
  const out: ContactFacets = {
    total: rows.length,
    matching: 0,
    quickViews: { all: 0, overdue: 0, dueToday: 0 },
    facets: {
      status: zero(STATUSES),
      matterType: zero(MATTER_TYPES),
      referralSource: zero(REFERRAL_SOURCES),
      followUp: zero(FOLLOW_UP_FILTERS),
    },
  };
  for (const r of rows) {
    if (matches(r, f, t, tz)) out.matching++;
    if (matches(r, f, t, tz, 'status')) out.facets.status[r.status]++;
    if (matches(r, f, t, tz, 'matterType'))
      out.facets.matterType[r.matterType]++;
    if (matches(r, f, t, tz, 'referralSource') && r.referralSource)
      out.facets.referralSource[r.referralSource]++;
    if (matches(r, f, t, tz, 'followUp')) {
      for (const k of FOLLOW_UP_FILTERS)
        if (followUpBucket(r, k, t)) out.facets.followUp[k]++;
    }
    // Quick views count against the other filters (not follow-up), like the follow-up facet.
    if (matches(r, f, t, tz, 'followUp')) {
      out.quickViews.all++;
      if (followUpBucket(r, 'overdue', t)) out.quickViews.overdue++;
      if (followUpBucket(r, 'dueToday', t)) out.quickViews.dueToday++;
    }
  }
  return out;
}

export async function getPipelineColumn(
  status: Status,
  f: Filters,
  offset: number,
  limit = 50,
): Promise<{ rows: ContactRow[]; matching: number }> {
  const { rows, today: t, tz } = await load();
  const hit = rows
    .filter((r) => r.status === status && matches(r, f, t, tz, 'status'))
    .sort(compare('follow_up', 'asc'));
  return { rows: hit.slice(offset, offset + limit), matching: hit.length };
}

export async function getContact(id: string): Promise<ContactDetail | null> {
  const { rows } = await load();
  const r = rows.find((x) => x.id === id);
  if (!r) return null;
  return {
    ...r,
    summary: summaryOf(r),
    notes: [],
    activities: [
      {
        id: `${r.id}-a1`,
        type: 'created',
        payload: {},
        createdAt: r.createdAt,
        actor: { name: 'Khubaib' },
      },
    ],
  };
}
