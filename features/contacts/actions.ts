'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  makeContactInputSchema,
  type ContactInput,
  type ContactRow,
  type Note,
} from '@/lib/contracts/contact';
import { STATUSES, type Status } from '@/lib/contracts/enums';
import type { Permission } from '@/lib/contracts/permissions';
import { fail, ok, zodFieldErrors, type Result } from '@/lib/contracts/result';
import { assertPermission } from '@/lib/auth/viewer-supabase';
import {
  getFollowUpOn,
  insertContact,
  insertNote,
  setFollowUp,
  setStatus,
  updateContact,
} from '@/lib/data/mutations';
import { todayIn } from '@/lib/dates/date-only';
import { getRequestTimeZone } from '@/lib/dates/server';
import { createServerSupabase } from '@/lib/supabase/server';

const Id = z.uuid();
const Stamp = z.iso.datetime({ offset: true });
const NoteBody = z
  .string()
  .trim()
  .min(1, 'Write a note.')
  .max(2000, 'Note must be 2000 characters or fewer.');
const gone = () => fail('not_found', 'That contact no longer exists.');
const invalid = (fieldErrors: Record<string, string>) =>
  fail('validation', 'Fix the highlighted fields.', { fieldErrors });

// Permission first (unauthorized when the session expired), then db and today in the request tz.
async function start(p: Permission) {
  const g = await assertPermission(p);
  if (!g.ok) return g;
  const [db, tz] = await Promise.all([
    createServerSupabase(),
    getRequestTimeZone(),
  ]);
  return ok({ viewer: g.data, db, today: todayIn(tz) });
}

function revalidate(id?: string) {
  revalidatePath('/contacts');
  revalidatePath('/pipeline');
  if (id) revalidatePath(`/contacts/${id}`);
}

function done<T>(r: Result<T>, id?: string): Result<T> {
  if (r.ok) revalidate(id);
  return r;
}

export async function createContactAction(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  const c = await start('contacts.write');
  if (!c.ok) return c;
  const p = makeContactInputSchema({ today: c.data.today }).safeParse(raw);
  if (!p.success) return invalid(zodFieldErrors(p.error));
  const r = await insertContact(c.data.db, p.data);
  return done(r, r.ok ? r.data.id : undefined);
}

export async function updateContactAction(
  id: string,
  raw: unknown,
  expectedUpdatedAt: string,
): Promise<Result<ContactRow>> {
  const c = await start('contacts.write');
  if (!c.ok) return c;
  if (!Id.safeParse(id).success) return gone();
  if (!Stamp.safeParse(expectedUpdatedAt).success)
    return fail('validation', 'Reload the contact and try again.');
  const prev = await getFollowUpOn(c.data.db, id);
  if (!prev.ok) return prev;
  const p = makeContactInputSchema({
    today: c.data.today,
    previousFollowUpOn: prev.data,
  }).safeParse(raw);
  if (!p.success) return invalid(zodFieldErrors(p.error));
  const input: ContactInput = p.data;
  return done(
    await updateContact(c.data.db, id, input, expectedUpdatedAt, c.data.today),
    id,
  );
}

export async function moveContactAction(
  id: string,
  status: Status,
): Promise<Result<ContactRow>> {
  const c = await start('contacts.write');
  if (!c.ok) return c;
  if (!Id.safeParse(id).success) return gone();
  const s = z.enum(STATUSES).safeParse(status);
  if (!s.success) return invalid({ status: 'Choose Lead, Active or Closed.' });
  return done(await setStatus(c.data.db, id, s.data, c.data.today), id);
}

export async function rescheduleAction(
  id: string,
  followUpOn: string | null,
): Promise<Result<ContactRow>> {
  const c = await start('contacts.write');
  if (!c.ok) return c;
  if (!Id.safeParse(id).success) return gone();
  const d = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
    .refine((v) => v >= c.data.today, 'Follow-up date cannot be in the past.')
    .nullable()
    .safeParse(followUpOn);
  if (!d.success)
    return invalid({
      followUpOn: zodFieldErrors(d.error).form ?? 'Invalid date.',
    });
  return done(await setFollowUp(c.data.db, id, d.data, c.data.today), id);
}

export async function addNoteAction(
  contactId: string,
  body: string,
): Promise<Result<Note>> {
  const c = await start('notes.write');
  if (!c.ok) return c;
  if (!Id.safeParse(contactId).success) return gone();
  const b = NoteBody.safeParse(body);
  if (!b.success)
    return invalid({ body: zodFieldErrors(b.error).form ?? 'Invalid note.' });
  return done(
    await insertNote(c.data.db, contactId, b.data, c.data.viewer),
    contactId,
  );
}
