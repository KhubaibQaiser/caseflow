import { beforeEach, describe, expect, it } from 'vitest';
import { adminClient, resetData, rpc, serviceClient } from './setup';

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

    const changed = await rpc<number>(
      serviceClient(),
      'normalize_contact_phones',
    );
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
    expect(changed).toBe(4);
    // Rows left as they were: not E.164 after the pass.
    expect(
      after.filter((r) => r.phone && !/^\+\d+$/.test(r.phone)),
    ).toHaveLength(3);
    // No updated_at bump and no activity from the cleanup.
    expect(after.map((r) => r.updated_at)).toEqual(
      before.map((r) => r.updated_at),
    );
    // Running it again changes nothing.
    expect(await rpc<number>(serviceClient(), 'normalize_contact_phones')).toBe(
      0,
    );
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
