import { describe, expect, it } from 'vitest';
import { loadListQuery, type ListQuery } from '@/lib/contracts/list-query';
import { ContactFacetsSchema } from '@/lib/contracts/facets';
import {
  getContact,
  getContactFacets,
  getPipelineColumn,
  searchContacts,
} from './fake';

const q = (over: Partial<ListQuery>): ListQuery => ({
  ...loadListQuery(''),
  ...over,
});

describe('fake data layer', () => {
  it('searchContacts: lead rows, max 25, urgency order', async () => {
    const r = await searchContacts(
      q({ status: ['lead'], page: 1, size: 25, sort: 'follow_up' }),
    );
    expect(r.rows.length).toBeLessThanOrEqual(25);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.every((x) => x.status === 'lead')).toBe(true);
    const rank = (x: (typeof r.rows)[number]) =>
      x.urgency === 'overdue'
        ? 0
        : x.urgency === 'today'
          ? 1
          : x.followUpOn
            ? 2
            : 3;
    const ranks = r.rows.map(rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(r.matching).toBeGreaterThanOrEqual(r.rows.length);
    expect(r.total).toBeGreaterThanOrEqual(r.matching);
  });

  it('facets: status group ignores its own filter', async () => {
    const f = await getContactFacets({ status: ['lead'] });
    expect(ContactFacetsSchema.safeParse(f).success).toBe(true);
    expect(f.facets.status.active).toBeGreaterThan(0);
    expect(f.matching).toBe(f.facets.status.lead);
  });

  it('pipeline column and detail', async () => {
    const col = await getPipelineColumn('active', {}, 0, 50);
    expect(col.rows.length).toBeLessThanOrEqual(50);
    expect(col.rows.every((x) => x.status === 'active')).toBe(true);
    const d = await getContact(col.rows[0].id);
    expect(d?.id).toBe(col.rows[0].id);
    expect(await getContact('nope')).toBeNull();
  });

  it('clamps out-of-range page', async () => {
    const r = await searchContacts(
      q({ status: ['lead'], page: 9999, size: 25 }),
    );
    expect(r.rows.length).toBeGreaterThan(0);
  });
});
