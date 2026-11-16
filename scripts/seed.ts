import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const Env = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SEED_ADMIN_PASSWORD: z.string().min(8),
  SEED_VIEWER_PASSWORD: z.string().min(8),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  // Names only: never echo values.
  const names = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
  console.error(`seed: missing or invalid env: ${names.join(', ')}`);
  process.exit(1);
}
const env = parsed.data;

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ACCOUNTS = [
  {
    email: 'admin@caseflow.test',
    name: 'Alex Morgan',
    role: 'admin',
    password: env.SEED_ADMIN_PASSWORD,
  },
  {
    email: 'viewer@caseflow.test',
    name: 'Sam Patel',
    role: 'viewer',
    password: env.SEED_VIEWER_PASSWORD,
  },
] as const;

async function upsertAccount(a: (typeof ACCOUNTS)[number]): Promise<string> {
  const created = await db.auth.admin.createUser({
    email: a.email,
    password: a.password,
    email_confirm: true,
  });
  let id = created.data.user?.id;
  if (!id) {
    // ponytail: first 1000 users only; this project has a handful.
    const list = await db.auth.admin.listUsers({ perPage: 1000 });
    if (list.error) throw new Error(`list users: ${list.error.message}`);
    id = list.data.users.find((u) => u.email === a.email)?.id;
    if (!id)
      throw new Error(
        `create ${a.email}: ${created.error?.message ?? 'unknown error'}`,
      );
    const upd = await db.auth.admin.updateUserById(id, {
      password: a.password,
      email_confirm: true,
    });
    if (upd.error) throw new Error(`update ${a.email}: ${upd.error.message}`);
  }
  const prof = await db
    .from('profiles')
    .upsert({ user_id: id, display_name: a.name, role: a.role });
  if (prof.error) throw new Error(`profile ${a.email}: ${prof.error.message}`);
  return id;
}

async function count(table: string): Promise<number> {
  const { count: n, error } = await db
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return n ?? 0;
}

async function main() {
  const ids = [];
  for (const a of ACCOUNTS) ids.push(await upsertAccount(a));
  const adminId = ids[0];
  const res = await db.rpc('seed_firm', { n: 2500, actor: adminId });
  if (res.error) throw new Error(`seed_firm: ${res.error.message}`);
  console.log(
    `seeded ${ACCOUNTS.length} accounts, ${await count('contacts')} contacts, ` +
      `${await count('notes')} notes, ${await count('activities')} activities`,
  );
}

main().catch((e: unknown) => {
  console.error(
    `seed failed: ${e instanceof Error ? e.message : 'unknown error'}`,
  );
  process.exit(1);
});
