import { execFileSync } from 'node:child_process';
import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, resetData, rpc, serviceClient } from './setup';

// Re-runs the migration file (its helpers drop themselves; seed_firm is create-or-replace) so its effect on rows is tested.
function runMigration() {
  const env = execFileSync('supabase', ['status', '-o', 'env'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const url = /^DB_URL="?(.*?)"?$/m.exec(env)?.[1];
  if (!url) throw new Error('no DB_URL');
  execFileSync(
    'psql',
    [
      url,
      '-v',
      'ON_ERROR_STOP=1',
      '-q',
      '-f',
      'supabase/migrations/2026111608_phone_e164.sql',
    ],
    { stdio: 'ignore' },
  );
}

async function add(full_name: string, phone: string | null): Promise<void> {
  const { error } = await serviceClient().rpc('seed_insert_contact', {
    c: { full_name, matter_type: 'family', email: 'x@example.test', phone },
  });
  if (error) throw new Error(error.message);
}

const phones = async () => {
  const { data, error } = await serviceClient()
    .from('contacts')
    .select('full_name, phone, phone_digits, updated_at')
    .order('full_name');
  if (error) throw new Error(error.message);
  return data;
};

beforeEach(resetData);

describe('phone numbers as E.164', () => {
  it('normalises legacy values and leaves the rest', async () => {
    await add('A seeded', '(512) 555-0148');
    await add('B bare', '5125550149');
    await add('C eleven', '1-512-555-0150');
    await add('D plus', '+1 512 555 0151');
    await add('E uk', '+44 7400 123456');
    await add('F short', '555-0100');
    await add('G text', 'ext 5');
    await add('H none', null);
    const before = await phones();

    runMigration();
    const after = await phones();

    expect(after.map((r) => r.phone)).toEqual([
      '+15125550148',
      '+15125550149',
      '+15125550150',
      '+15125550151',
      '+44 7400 123456',
      '555-0100',
      'ext 5',
      null,
    ]);
    // Rows left as they were: not E.164 after the pass.
    expect(
      after.filter((r) => r.phone && !/^\+\d+$/.test(r.phone)),
    ).toHaveLength(3);
    // No updated_at bump and no activity from the cleanup.
    expect(after.map((r) => r.updated_at)).toEqual(
      before.map((r) => r.updated_at),
    );
    // The privileged helper does not stay behind.
    const gone = await serviceClient().rpc('normalize_contact_phones');
    expect(gone.error).not.toBeNull();
  });

  it('keeps phone_digits, so search by digits still finds E.164 numbers', async () => {
    await add('Phone Person', '+15125550148');
    const [row] = await phones();
    expect(row?.phone_digits).toBe('15125550148');
    const admin = await adminClient();
    for (const q of ['5550148', '(512) 555-0148', '+1 512 555 0148']) {
      const r = await rpc<{ rows: { full_name: string }[] }>(
        admin.client,
        'search_contacts',
        { f: { q }, sort: 'follow_up', dir: 'asc', page: 1, page_size: 25 },
      );
      expect(r.rows.map((x) => x.full_name)).toEqual(['Phone Person']);
    }
  });
});
