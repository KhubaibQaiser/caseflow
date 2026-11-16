import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { todayIn } from '@/lib/dates/date-only';
import { ACTIVITY_TYPES, MATTER_TYPES, STATUSES } from '@/lib/contracts/enums';
import { localConfig, resetData, serviceClient } from './setup';

// Throwaway local-only passwords for the seed under test.
const ADMIN_PW = 'it-seed-Admin-1!';
const VIEWER_PW = 'it-seed-Viewer-1!';

function runSeed(env: Record<string, string | undefined>) {
  const c = localConfig();
  return execFileSync('pnpm', ['seed'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      SUPABASE_URL: c.url,
      SUPABASE_SECRET_KEY: c.secret,
      SEED_ADMIN_PASSWORD: ADMIN_PW,
      SEED_VIEWER_PASSWORD: VIEWER_PW,
      ...env,
    },
  });
}

const head = (table: string) =>
  serviceClient().from(table).select('*', { count: 'exact', head: true });

async function n(
  q: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

describe('seed', () => {
  beforeAll(async () => {
    await resetData();
    const svc = serviceClient();
    const del = await svc.from('profiles').delete().neq('display_name', '');
    if (del.error) throw new Error(del.error.message);
    runSeed({});
    runSeed({});
  }, 180_000);

  it('creates exactly the two role accounts', async () => {
    const { data, error } = await serviceClient()
      .from('profiles')
      .select('display_name, role')
      .order('display_name');
    expect(error).toBeNull();
    expect(data).toEqual([
      { display_name: 'Alex Morgan', role: 'admin' },
      { display_name: 'Sam Patel', role: 'viewer' },
    ]);
  });

  it('is idempotent: 2500 contacts and one created activity each', async () => {
    expect(await n(head('contacts'))).toBe(2500);
    expect(await n(head('activities').eq('type', 'created'))).toBe(2500);
    const changes = await n(head('activities').eq('type', 'status_changed'));
    expect(await n(head('activities'))).toBe(2500 + changes);
    expect(changes).toBeGreaterThan(0);
  });

  it('uses only contract enum values and valid contact info', async () => {
    const { data, error } = await serviceClient()
      .from('contacts')
      .select('status, matter_type, email, phone, created_at')
      .limit(2500);
    expect(error).toBeNull();
    const rows = data ?? [];
    const floor = Date.now() - 121 * 86_400_000;
    for (const r of rows) {
      expect(STATUSES).toContain(r.status);
      expect(MATTER_TYPES).toContain(r.matter_type);
      expect(r.email ?? r.phone).toBeTruthy();
      expect(Date.parse(r.created_at)).toBeGreaterThan(floor);
    }
    const closed = rows.filter((r) => r.status === 'closed').length;
    expect(closed / rows.length).toBeGreaterThan(0.4);
    expect(closed / rows.length).toBeLessThan(0.56);
    const { data: acts } = await serviceClient()
      .from('activities')
      .select('type')
      .limit(10);
    for (const a of acts ?? []) expect(ACTIVITY_TYPES).toContain(a.type);
  });

  it('has about 2% overdue, only among lead and active, and closed never due', async () => {
    const today = todayIn('UTC');
    const open = await n(
      head('contacts')
        .in('status', ['lead', 'active'])
        .lt('follow_up_on', today),
    );
    expect(open).toBeGreaterThanOrEqual(25);
    expect(open).toBeLessThanOrEqual(100);
    expect(
      await n(
        head('contacts').eq('status', 'closed').lte('follow_up_on', today),
      ),
    ).toBe(0);
    expect(await n(head('contacts').eq('follow_up_on', today))).toBeGreaterThan(
      0,
    );
  });

  it('gives realistic timestamps and no soft-deleted contacts', async () => {
    const { data, error } = await serviceClient()
      .from('contacts')
      .select('created_at, updated_at, deleted_at')
      .limit(2500);
    expect(error).toBeNull();
    const rows = data ?? [];
    const now = Date.now();
    for (const r of rows) {
      expect(Date.parse(r.updated_at)).toBeGreaterThanOrEqual(
        Date.parse(r.created_at),
      );
      expect(Date.parse(r.updated_at)).toBeLessThanOrEqual(now);
      expect(r.deleted_at).toBeNull();
    }
    expect(new Set(rows.map((r) => r.updated_at)).size).toBeGreaterThan(900);
  });

  it('seeds 0-3 notes per contact', async () => {
    expect(await n(head('notes'))).toBeGreaterThan(1000);
  });

  it('lets the admin sign in with SEED_ADMIN_PASSWORD', async () => {
    const c = localConfig();
    const client = createClient(c.url, c.anon, {
      auth: { persistSession: false },
    });
    const { error } = await client.auth.signInWithPassword({
      email: 'admin@caseflow.test',
      password: ADMIN_PW,
    });
    expect(error).toBeNull();
  });

  it('refuses to run without passwords and never prints them', () => {
    let err: { stderr?: string; stdout?: string } | undefined;
    try {
      runSeed({ SEED_ADMIN_PASSWORD: '' });
    } catch (e) {
      err = e as { stderr?: string; stdout?: string };
    }
    expect(err).toBeDefined();
    const out = `${err?.stdout ?? ''}${err?.stderr ?? ''}`;
    expect(out).not.toContain(ADMIN_PW);
    expect(out).not.toContain(VIEWER_PW);
  });
});
