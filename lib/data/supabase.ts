import 'server-only';
import {
  ContactDetailSchema,
  ContactRowSchema,
  type ContactDetail,
  type ContactRow,
} from '@/lib/contracts/contact';
import type { Status } from '@/lib/contracts/enums';
import {
  ContactFacetsSchema,
  type ContactFacets,
} from '@/lib/contracts/facets';
import {
  PAGE_SIZES,
  toFilters,
  type Filters,
  type ListQuery,
} from '@/lib/contracts/list-query';
import { todayIn } from '@/lib/dates/date-only';
import { urgencyOf } from '@/lib/dates/urgency';
import { getRequestTimeZone } from '@/lib/dates/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

// Typed server error. The message never carries row data.
export class DataError extends Error {
  override name = 'DataError';
}

const fail = (what: string, cause?: unknown): never => {
  throw new DataError(`${what} failed`, { cause });
};

type Raw = Record<string, unknown>;

export function mapContactRow(raw: Raw): ContactRow {
  const r = ContactRowSchema.safeParse({
    id: raw.id,
    fullName: raw.full_name,
    email: raw.email,
    phone: raw.phone,
    matterType: raw.matter_type,
    referralSource: raw.referral_source,
    status: raw.status,
    followUpOn: raw.follow_up_on,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    urgency: raw.urgency,
    daysOverdue: raw.days_overdue,
  });
  return r.success ? r.data : fail('Invalid contact row', r.error.issues);
}

const SearchSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  total: z.number(),
  matching: z.number(),
});

async function search(
  f: Filters,
  o: { sort: string; dir: string; page: number; size: number },
): Promise<{ rows: ContactRow[]; total: number; matching: number }> {
  const [db, tz] = await Promise.all([
    createServerSupabase(),
    getRequestTimeZone(),
  ]);
  const { data, error } = await db.rpc('search_contacts', {
    f,
    sort: o.sort,
    dir: o.dir,
    page: o.page,
    page_size: o.size,
    tz,
  });
  if (error) fail('search_contacts', error.code);
  const p = SearchSchema.safeParse(data);
  if (!p.success) return fail('search_contacts response', p.error.issues);
  return { ...p.data, rows: p.data.rows.map(mapContactRow) };
}

export async function searchContacts(q: ListQuery) {
  const { rows, total, matching } = await search(toFilters(q), {
    sort: q.sort,
    dir: q.dir,
    page: q.page,
    size: q.size,
  });
  return { rows, total, matching };
}

export async function getContactFacets(f: Filters): Promise<ContactFacets> {
  const [db, tz] = await Promise.all([
    createServerSupabase(),
    getRequestTimeZone(),
  ]);
  const { data, error } = await db.rpc('contact_facets', { f, tz });
  if (error) fail('contact_facets', error.code);
  const p = ContactFacetsSchema.safeParse(data);
  return p.success ? p.data : fail('contact_facets response', p.error.issues);
}

// The RPC pages by number, so offset must sit on a page boundary ("Show 50 more").
export async function getPipelineColumn(
  status: Status,
  f: Filters,
  offset: number,
  limit = 50,
): Promise<{ rows: ContactRow[]; matching: number }> {
  if (
    !(PAGE_SIZES as readonly number[]).includes(limit) ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset % limit
  )
    fail('getPipelineColumn paging');
  const r = await search(
    { ...f, status: [status] },
    {
      sort: 'follow_up',
      dir: 'asc',
      page: offset / limit + 1,
      size: limit,
    },
  );
  // The RPC clamps a page past the end to the last page; that is not "more".
  return {
    rows: offset >= r.matching ? [] : r.rows,
    matching: r.matching,
  };
}

const DetailRaw = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  matter_type: z.string(),
  referral_source: z.string().nullable(),
  status: z.string(),
  follow_up_on: z.string().nullable(),
  summary: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  notes: z.array(
    z.object({
      id: z.string(),
      body: z.string(),
      created_at: z.string(),
      author: z.object({ display_name: z.string(), role: z.string() }),
    }),
  ),
  activities: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      payload: z.record(z.string(), z.unknown()),
      created_at: z.string(),
      actor: z.object({ display_name: z.string() }).nullable(),
    }),
  ),
});

export async function getContact(id: string): Promise<ContactDetail | null> {
  const [db, tz] = await Promise.all([
    createServerSupabase(),
    getRequestTimeZone(),
  ]);
  // Activities from one statement share created_at, so id breaks the tie.
  const { data, error } = await db
    .from('contacts')
    .select(
      `id, full_name, email, phone, matter_type, referral_source, status,
       follow_up_on, summary, created_at, updated_at,
       notes(id, body, created_at, author:profiles!notes_author_id_fkey(display_name, role)),
       activities(id, type, payload, created_at, actor:profiles!activities_actor_id_fkey(display_name))`,
    )
    .eq('id', id)
    .is('deleted_at', null)
    .not('activities.type', 'in', '(deleted,restored)')
    .order('created_at', { referencedTable: 'notes', ascending: false })
    .order('id', { referencedTable: 'notes', ascending: false })
    .order('created_at', { referencedTable: 'activities', ascending: false })
    .order('id', { referencedTable: 'activities', ascending: false })
    .limit(100, { referencedTable: 'activities' })
    .maybeSingle();
  if (error) fail('getContact', error.code);
  if (!data) return null;
  const p = DetailRaw.safeParse(data);
  if (!p.success) return fail('getContact response', p.error.issues);
  const c = p.data;

  const { urgency, daysOverdue } = urgencyOf(
    c.status as Status,
    c.follow_up_on,
    todayIn(tz),
  );
  const parsed = ContactDetailSchema.safeParse({
    ...mapContactRowFields(c),
    urgency,
    daysOverdue,
    summary: c.summary,
    notes: c.notes.map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.created_at,
      author: { name: n.author.display_name, role: n.author.role },
    })),
    activities: c.activities.map((a) => ({
      id: a.id,
      type: a.type,
      payload: a.payload,
      createdAt: a.created_at,
      actor: { name: a.actor?.display_name ?? 'Unknown' },
    })),
  });
  return parsed.success
    ? parsed.data
    : fail('getContact response', parsed.error.issues);
}

function mapContactRowFields(c: z.infer<typeof DetailRaw>) {
  return {
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    matterType: c.matter_type,
    referralSource: c.referral_source,
    status: c.status,
    followUpOn: c.follow_up_on,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}
