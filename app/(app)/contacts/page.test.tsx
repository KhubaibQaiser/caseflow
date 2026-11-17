import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ListQuery } from '@/lib/contracts/list-query';
import { FACETS } from '@/features/contacts/list/test-utils';

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirect(url),
}));
vi.mock('@/lib/dates/server', () => ({
  getRequestTimeZone: async () => 'UTC',
}));
const searchContacts = vi.fn(async (q: ListQuery) => {
  void q;
  return { rows: [], total: 1200, matching: 1200 };
});
vi.mock('@/lib/data', () => ({
  searchContacts: (q: ListQuery) => searchContacts(q),
  getContactFacets: async () => FACETS,
}));

const { default: ContactsPage } = await import('./page');
const visit = (params: Record<string, string>) =>
  ContactsPage({
    searchParams: Promise.resolve(params),
    params: Promise.resolve({}),
  });

describe('/contacts page', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('clamps a page past the end to the last page, keeping the filters', async () => {
    // 1,200 rows at 250 a page is 5 pages.
    await expect(visit({ page: '999', status: 'lead' })).rejects.toThrow(
      'NEXT_REDIRECT /contacts?status=lead&page=5',
    );
  });

  it('drops invalid params on the way', async () => {
    await expect(
      visit({ page: '9', status: 'foo', size: '7' }),
    ).rejects.toThrow('NEXT_REDIRECT /contacts?page=5');
  });

  it('renders an in-range page without redirecting', async () => {
    await visit({ page: '5' });
    expect(redirect).not.toHaveBeenCalled();
    expect(searchContacts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 5, size: 250 }),
    );
  });
});
