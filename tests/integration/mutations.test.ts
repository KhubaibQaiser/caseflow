import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import {
  insertContact,
  insertNote,
  setFollowUp,
  setStatus,
  updateContact,
} from '@/lib/data/mutations';
import {
  adminClient,
  anonClient,
  resetData,
  seedContact,
  viewerClient,
} from './setup';

const revalidatePath = vi.hoisted(() => vi.fn());
let current: SupabaseClient | null = null;
vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (n === 'tz' ? { value: 'UTC' } : undefined),
  }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => current,
}));

import {
  addNoteAction,
  createContactAction,
  moveContactAction,
  rescheduleAction,
  updateContactAction,
} from '@/features/contacts/actions';

const TODAY = '2026-11-17';
const db = (c: SupabaseClient) => c as SupabaseClient<Database>;
const input = {
  fullName: 'Ana Ruiz',
  email: 'ana@example.com',
  phone: null,
  matterType: 'family' as const,
  referralSource: null,
  status: 'lead' as const,
  followUpOn: null,
  summary: null,
};
const fresh = async (a: { client: SupabaseClient }) => {
  const { data } = await seedContact(a.client, {
    full_name: 'Ana Ruiz',
    phone: '5125550101',
  });
  return data as { id: string; updated_at: string };
};

beforeEach(async () => {
  await resetData();
  revalidatePath.mockClear();
});

describe('mutations', () => {
  it('insertContact returns the new id', async () => {
    const a = await adminClient();
    const r = await insertContact(db(a.client), input, TODAY);
    expect(r.ok && r.data.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('updateContact with the current updated_at succeeds; a stale one conflicts', async () => {
    const a = await adminClient();
    const c = await fresh(a);
    const ok = await updateContact(
      db(a.client),
      c.id,
      { ...input, fullName: 'Ana R' },
      c.updated_at,
      TODAY,
    );
    expect(ok).toMatchObject({ ok: true, data: { fullName: 'Ana R' } });
    const stale = await updateContact(
      db(a.client),
      c.id,
      input,
      c.updated_at,
      TODAY,
    );
    expect(stale).toMatchObject({ ok: false, error: { code: 'conflict' } });
  });

  it('updateContact on a missing id is not_found', async () => {
    const a = await adminClient();
    const r = await updateContact(
      db(a.client),
      '00000000-0000-0000-0000-000000000001',
      input,
      '2026-01-01T00:00:00+00:00',
      TODAY,
    );
    expect(r).toMatchObject({ ok: false, error: { code: 'not_found' } });
  });

  it('viewer writes are forbidden', async () => {
    const a = await adminClient();
    const v = await viewerClient();
    const c = await fresh(a);
    expect(await setStatus(db(v.client), c.id, 'active', TODAY)).toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    expect(
      await setFollowUp(db(v.client), c.id, '2026-12-01', TODAY),
    ).toMatchObject({ ok: false, error: { code: 'forbidden' } });
    expect(
      await updateContact(db(v.client), c.id, input, c.updated_at, TODAY),
    ).toMatchObject({ ok: false, error: { code: 'forbidden' } });
    expect(await insertContact(db(v.client), input, TODAY)).toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    expect(
      await insertNote(db(v.client), c.id, 'hi', {
        id: v.userId,
        displayName: 'IT Viewer',
        role: 'viewer',
      }),
    ).toMatchObject({ ok: false, error: { code: 'forbidden' } });
  });

  it('setStatus and setFollowUp return the updated row with urgency', async () => {
    const a = await adminClient();
    const c = await fresh(a);
    const s = await setStatus(db(a.client), c.id, 'active', TODAY);
    expect(s).toMatchObject({ ok: true, data: { status: 'active' } });
    const f = await setFollowUp(db(a.client), c.id, '2026-11-10', TODAY);
    expect(f).toMatchObject({
      ok: true,
      data: { followUpOn: '2026-11-10', urgency: 'overdue', daysOverdue: 7 },
    });
  });

  it('insertNote rejects an empty body as validation and returns the note otherwise', async () => {
    const a = await adminClient();
    const c = await fresh(a);
    const author = { id: a.userId, displayName: 'IT Admin', role: 'admin' as const };
    expect(await insertNote(db(a.client), c.id, '', author)).toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    expect(await insertNote(db(a.client), c.id, 'Called', author)).toMatchObject(
      { ok: true, data: { body: 'Called', author: { name: 'IT Admin' } } },
    );
  });
});

describe('server actions', () => {
  it('createContactAction maps every invalid field at once, then creates and revalidates', async () => {
    current = (await adminClient()).client;
    const bad = await createContactAction({ fullName: 'A', status: 'lead' });
    expect(bad).toMatchObject({
      ok: false,
      error: {
        code: 'validation',
        fieldErrors: {
          fullName: 'Name must be at least 2 characters.',
          matterType: 'Choose a matter type.',
          contactMethod: 'Add an email or a phone number.',
        },
      },
    });
    const r = await createContactAction(input);
    expect(r.ok).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/contacts');
    expect(revalidatePath).toHaveBeenCalledWith('/pipeline');
  });

  it('returns unauthorized with no session and forbidden for a viewer', async () => {
    current = anonClient();
    expect(await createContactAction(input)).toMatchObject({
      ok: false,
      error: { code: 'unauthorized' },
    });
    current = (await viewerClient()).client;
    expect(await createContactAction(input)).toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    expect(await moveContactAction('x', 'active')).toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
    expect(await addNoteAction('x', 'hi')).toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
  });

  it('updateContactAction reports conflict and accepts an unchanged past follow-up', async () => {
    const a = await adminClient();
    current = a.client;
    const { data } = await seedContact(a.client, {
      full_name: 'Ana Ruiz',
      phone: '5125550101',
      follow_up_on: '2020-01-01',
    });
    const c = data as { id: string; updated_at: string };
    const edit = { ...input, followUpOn: '2020-01-01' };
    expect(
      await updateContactAction(c.id, edit, c.updated_at),
    ).toMatchObject({ ok: true });
    expect(
      await updateContactAction(c.id, edit, c.updated_at),
    ).toMatchObject({ ok: false, error: { code: 'conflict' } });
    expect(
      await updateContactAction(
        c.id,
        { ...input, followUpOn: '2020-01-02' },
        c.updated_at,
      ),
    ).toMatchObject({
      ok: false,
      error: {
        fieldErrors: { followUpOn: 'Follow-up date cannot be in the past.' },
      },
    });
  });

  it('move, reschedule and addNote work and validate', async () => {
    const a = await adminClient();
    current = a.client;
    const c = await fresh(a);
    expect(await moveContactAction(c.id, 'closed')).toMatchObject({
      ok: true,
      data: { status: 'closed' },
    });
    expect(await moveContactAction(c.id, 'nope' as 'lead')).toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    expect(await rescheduleAction(c.id, '2000-01-01')).toMatchObject({
      ok: false,
      error: { code: 'validation' },
    });
    expect(await rescheduleAction(c.id, null)).toMatchObject({ ok: true });
    expect(await addNoteAction(c.id, '   ')).toMatchObject({
      ok: false,
      error: { code: 'validation', fieldErrors: { body: expect.any(String) } },
    });
    expect(await addNoteAction(c.id, ' Called ')).toMatchObject({
      ok: true,
      data: { body: 'Called' },
    });
    expect(await moveContactAction('not-a-uuid', 'lead')).toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    });
  });
});
