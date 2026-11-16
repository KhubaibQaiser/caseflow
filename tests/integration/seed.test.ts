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

// PostgREST caps a select at 1000 rows: page through all of them.
async function all(table: string, cols: string) {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await serviceClient()
      .from(table)
      .select(cols)
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    out.push(...page);
    if (page.length < 1000) return out;
  }
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
    const list = (v: readonly string[]) => `(${v.join(',')})`;
    expect(await n(head('contacts').not('status', 'in', list(STATUSES)))).toBe(
      0,
    );
    expect(
      await n(head('contacts').not('matter_type', 'in', list(MATTER_TYPES))),
    ).toBe(0);
    expect(
      await n(head('activities').not('type', 'in', list(ACTIVITY_TYPES))),
    ).toBe(0);
    expect(await n(head('contacts').is('email', null).is('phone', null))).toBe(
      0,
    );
    const closed = await n(head('contacts').eq('status', 'closed'));
    expect(closed / 2500).toBeGreaterThan(0.4);
    expect(closed / 2500).toBeLessThan(0.56);
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
    const nowIso = new Date().toISOString();
    const floor = new Date(Date.now() - 121 * 86_400_000).toISOString();
    expect(await n(head('contacts').not('deleted_at', 'is', null))).toBe(0);
    expect(await n(head('contacts').lt('created_at', floor))).toBe(0);
    expect(await n(head('contacts').gt('updated_at', nowIso))).toBe(0);
    // column-to-column comparison is not expressible in PostgREST filters
    const rows = await all('contacts', 'created_at, updated_at, updated_by');
    expect(rows).toHaveLength(2500);
    let backwards = 0;
    for (const r of rows) {
      if (Date.parse(String(r.updated_at)) < Date.parse(String(r.created_at)))
        backwards++;
    }
    expect(backwards).toBe(0);
    expect(new Set(rows.map((r) => r.updated_at)).size).toBeGreaterThan(2400);
    expect(rows.every((r) => r.updated_by !== null)).toBe(true);
  });

  it('seeds 0-3 notes per contact', async () => {
    const perContact = new Map<string, number>();
    for (const r of await all('notes', 'contact_id'))
      perContact.set(
        String(r.contact_id),
        (perContact.get(String(r.contact_id)) ?? 0) + 1,
      );
    expect(Math.max(...perContact.values())).toBeLessThanOrEqual(3);
    expect(perContact.size).toBeGreaterThan(1500);
  });

  it('gives every contact a unique phone number', async () => {
    const phones = (await all('contacts', 'phone'))
      .map((r) => r.phone)
      .filter((p) => p !== null);
    expect(new Set(phones).size).toBe(phones.length);
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
