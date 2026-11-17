import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ContactRowSchema,
  NoteSchema,
  type ContactInput,
  type ContactRow,
  type Note,
} from '@/lib/contracts/contact';
import type { Status } from '@/lib/contracts/enums';
import type { RichDoc } from '@/lib/contracts/rich-text';
import type { Role } from '@/lib/contracts/permissions';
import { fail, ok, type Result } from '@/lib/contracts/result';
import { urgencyOf } from '@/lib/dates/urgency';
import type { Database } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;
type PgError = { code?: string };

// The message never carries row data.
function mapError(e: PgError): Result<never> {
  switch (e.code) {
    case '42501':
      return fail('forbidden', 'You do not have permission to do that.');
    case '23514':
      return fail('validation', 'Check the values and try again.');
    case 'PGRST301': // JWT expired
      return fail('unauthorized', 'Sign in again to continue.');
    case '22P02': // malformed uuid
      return fail('not_found', 'That contact no longer exists.');
    default:
      return fail('server', 'Something went wrong. Try again.');
  }
}

const COLS =
  'id, full_name, email, phone, matter_type, referral_source, status, follow_up_on, created_at, updated_at';

function toRow(
  r: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    matter_type: string;
    referral_source: string | null;
    status: Status;
    follow_up_on: string | null;
    created_at: string;
    updated_at: string;
  },
  today: string,
): Result<ContactRow> {
  const p = ContactRowSchema.safeParse({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    matterType: r.matter_type,
    referralSource: r.referral_source,
    status: r.status,
    followUpOn: r.follow_up_on,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...urgencyOf(r.status, r.follow_up_on, today),
  });
  return p.success
    ? ok(p.data)
    : fail('server', 'Something went wrong. Try again.');
}

const toColumns = (i: ContactInput) => ({
  full_name: i.fullName,
  email: i.email,
  phone: i.phone,
  matter_type: i.matterType,
  referral_source: i.referralSource,
  status: i.status,
  follow_up_on: i.followUpOn,
  summary: i.summary,
});

export async function insertContact(
  db: Db,
  input: ContactInput,
): Promise<Result<{ id: string }>> {
  const { data, error } = await db
    .from('contacts')
    .insert(toColumns(input))
    .select('id')
    .single();
  return error ? mapError(error) : ok({ id: data.id });
}

// 0 rows: the row is missing, the viewer may not write, or someone changed it first.
async function explainEmptyUpdate(
  db: Db,
  id: string,
  expectedUpdatedAt?: string,
): Promise<Result<never>> {
  const { data, error } = await db
    .from('contacts')
    .select('updated_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) return mapError(error);
  if (!data) return fail('not_found', 'That contact no longer exists.');
  if (
    expectedUpdatedAt !== undefined &&
    Date.parse(data.updated_at) !== Date.parse(expectedUpdatedAt)
  )
    return fail('conflict', 'This contact was changed since you opened it.');
  return fail('forbidden', 'You do not have permission to do that.');
}

async function patch(
  db: Db,
  id: string,
  values: Database['public']['Tables']['contacts']['Update'],
  today: string,
  expectedUpdatedAt?: string,
): Promise<Result<ContactRow>> {
  let q = db
    .from('contacts')
    .update(values)
    .eq('id', id)
    .is('deleted_at', null);
  if (expectedUpdatedAt !== undefined)
    q = q.eq('updated_at', expectedUpdatedAt);
  const { data, error } = await q.select(COLS).maybeSingle();
  if (error) return mapError(error);
  if (!data) return explainEmptyUpdate(db, id, expectedUpdatedAt);
  return toRow(data, today);
}

export const updateContact = (
  db: Db,
  id: string,
  input: ContactInput,
  expectedUpdatedAt: string,
  today: string,
) => patch(db, id, toColumns(input), today, expectedUpdatedAt);

export const setStatus = (db: Db, id: string, status: Status, today: string) =>
  patch(db, id, { status }, today);

export const setFollowUp = (
  db: Db,
  id: string,
  followUpOn: string | null,
  today: string,
) => patch(db, id, { follow_up_on: followUpOn }, today);

export async function getFollowUpOn(
  db: Db,
  id: string,
): Promise<Result<string | null>> {
  const { data, error } = await db
    .from('contacts')
    .select('follow_up_on')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) return mapError(error);
  return data
    ? ok(data.follow_up_on)
    : fail('not_found', 'That contact no longer exists.');
}

export async function insertNote(
  db: Db,
  contactId: string,
  note: { body: string; bodyJson: RichDoc },
  author: { id: string; displayName: string; role: Role },
): Promise<Result<Note>> {
  const { data, error } = await db
    .from('notes')
    .insert({
      contact_id: contactId,
      body: note.body,
      body_json: note.bodyJson,
      author_id: author.id,
    })
    .select('id, body, body_json, created_at')
    .single();
  if (error)
    // 23503: the contact id does not exist
    return error.code === '23503'
      ? fail('not_found', 'That contact no longer exists.')
      : mapError(error);
  const p = NoteSchema.safeParse({
    id: data.id,
    body: data.body,
    bodyJson: data.body_json,
    createdAt: data.created_at,
    author: { name: author.displayName, role: author.role },
  });
  return p.success
    ? ok(p.data)
    : fail('server', 'Something went wrong. Try again.');
}
