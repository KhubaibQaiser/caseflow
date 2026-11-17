import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { addDaysDateOnly, todayIn } from '@/lib/dates/date-only';

import { seedPassword } from './helpers';

// Specs that write make their own contact, so they never depend on (or disturb) another spec's rows.
// It is written as the seeded Admin through RLS, exactly as the app would.
const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`e2e needs ${k} (seeded local stack)`);
  return v;
};

let session: Promise<{ db: SupabaseClient; userId: string }> | undefined;
function admin() {
  session ??= (async () => {
    const db = createClient(
      env('SUPABASE_URL'),
      env('SUPABASE_PUBLISHABLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await db.auth.signInWithPassword({
      email: 'admin@caseflow.test',
      password: seedPassword('admin'),
    });
    if (error || !data.user) throw new Error('e2e admin sign-in failed');
    return { db, userId: data.user.id };
  })();
  return session;
}

export const today = todayIn('UTC');
export const inDays = (n: number) => addDaysDateOnly(today, n);

type NewContact = {
  name?: string;
  status?: 'lead' | 'active' | 'closed';
  followUpOn?: string | null;
  notes?: string[];
};

export async function newContact(over: NewContact = {}) {
  const { db, userId } = await admin();
  const fullName =
    over.name ?? `E2E Client ${Math.random().toString(36).slice(2, 8)}`;
  const email = `${Math.random().toString(36).slice(2, 10)}@example.test`;
  const phone = '(212) 555-0199';
  const { data, error } = await db
    .from('contacts')
    .insert({
      full_name: fullName,
      email,
      phone,
      matter_type: 'family',
      status: over.status ?? 'lead',
      follow_up_on: over.followUpOn === undefined ? inDays(5) : over.followUpOn,
    })
    .select('id')
    .single();
  if (error) throw new Error(`newContact: ${error.message}`);
  for (const body of over.notes ?? []) {
    const n = await db
      .from('notes')
      .insert({ contact_id: data.id, author_id: userId, body });
    if (n.error) throw new Error(`newContact note: ${n.error.message}`);
  }
  return { id: data.id as string, fullName, email, phone };
}

/** A second writer: changes the contact behind an open page, which bumps updated_at. */
export async function editBehindBack(id: string, fullName: string) {
  const { db } = await admin();
  const { error } = await db
    .from('contacts')
    .update({ full_name: fullName })
    .eq('id', id);
  if (error) throw new Error(`editBehindBack: ${error.message}`);
}
