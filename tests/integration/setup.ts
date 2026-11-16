import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Local stack config: env vars SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
// SUPABASE_SECRET_KEY win; otherwise read from `supabase status -o env`
// (API_URL, ANON_KEY/PUBLISHABLE_KEY, SERVICE_ROLE_KEY/SECRET_KEY). Nothing is committed.
type Cfg = { url: string; anon: string; secret: string };
let cfg: Cfg | undefined;

// resetData() deletes firm data: refuse anything but the local stack.
export function assertLocalUrl(url: string): string {
  const host = new URL(url).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(
      `Refusing to run integration tests against non-local host: ${host}`,
    );
  }
  return url;
}

function config(): Cfg {
  if (cfg) return cfg;
  const e = process.env;
  if (e.SUPABASE_URL) assertLocalUrl(e.SUPABASE_URL);
  if (e.SUPABASE_URL && e.SUPABASE_PUBLISHABLE_KEY && e.SUPABASE_SECRET_KEY) {
    return (cfg = {
      url: e.SUPABASE_URL,
      anon: e.SUPABASE_PUBLISHABLE_KEY,
      secret: e.SUPABASE_SECRET_KEY,
    });
  }
  const out = execSync('supabase status -o env', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const kv: Record<string, string> = {};
  for (const line of out.split('\n')) {
    const m = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim());
    if (m?.[1] && m[2] !== undefined) kv[m[1]] = m[2];
  }
  const url = kv.API_URL;
  const anon = kv.PUBLISHABLE_KEY ?? kv.ANON_KEY;
  const secret = kv.SECRET_KEY ?? kv.SERVICE_ROLE_KEY;
  if (!url || !anon || !secret)
    throw new Error('Local Supabase is not running (supabase start)');
  return (cfg = { url: assertLocalUrl(url), anon, secret });
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
export const PASSWORD = 'it-Passw0rd!local';

export type TestClient = { client: SupabaseClient; userId: string };

export function serviceClient(): SupabaseClient {
  const c = config();
  return createClient(c.url, c.secret, opts);
}

export function anonClient(): SupabaseClient {
  const c = config();
  return createClient(c.url, c.anon, opts);
}

export async function anonSignedIn(email: string): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(error.message);
  return client;
}

async function signedIn(
  email: string,
  name: string,
  role: 'admin' | 'viewer',
): Promise<TestClient> {
  const svc = serviceClient();
  const created = await svc.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  let userId = created.data.user?.id;
  if (!userId) {
    const list = await svc.auth.admin.listUsers({ perPage: 1000 });
    userId = list.data.users.find((u) => u.email === email)?.id;
  }
  if (!userId)
    throw new Error(`cannot create ${email}: ${created.error?.message}`);
  const prof = await svc
    .from('profiles')
    .upsert({ user_id: userId, display_name: name, role });
  if (prof.error) throw new Error(prof.error.message);

  const c = config();
  const client = createClient(c.url, c.anon, opts);
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(error.message);
  return { client, userId };
}

export const adminClient = () =>
  signedIn('it-admin@caseflow.test', 'IT Admin', 'admin');
export const viewerClient = () =>
  signedIn('it-viewer@caseflow.test', 'IT Viewer', 'viewer');

export async function resetData(): Promise<void> {
  const svc = serviceClient();
  const nil = '00000000-0000-0000-0000-000000000000';
  // notes and activities cascade from contacts
  for (const t of ['activities', 'notes', 'contacts']) {
    const { error } = await svc.from(t).delete().neq('id', nil);
    if (error) throw new Error(`${t}: ${error.message}`);
  }
}

export async function seedContact(
  client: SupabaseClient,
  partial: Record<string, unknown>,
) {
  return client
    .from('contacts')
    .insert({ matter_type: 'family', ...partial })
    .select()
    .single();
}

export async function rpc<T = unknown>(
  client: SupabaseClient,
  name: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data as T;
}
