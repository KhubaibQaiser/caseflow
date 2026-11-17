import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/shell/page-header';
import { ContactsView } from '@/features/contacts/list/contacts-view';
import { listPageFrame } from '@/features/contacts/list/frame';
import { NewContactLink } from '@/features/contacts/list/new-contact-link';
import { toListRows } from '@/features/contacts/list/list-rows';
import {
  clampPage,
  loadListQuery,
  serializeListQuery,
  toFilters,
} from '@/lib/contracts/list-query';
import { getContactFacets, searchContacts } from '@/lib/data';
import { todayIn } from '@/lib/dates/date-only';
import { getRequestTimeZone } from '@/lib/dates/server';

export const metadata: Metadata = { title: 'Contacts · Caseflow' };

const fmt = (n: number) => n.toLocaleString('en-US');

export default async function ContactsPage({
  searchParams,
}: PageProps<'/contacts'>) {
  // Bad params fall back to defaults; they never error (spec 8.3).
  const query = loadListQuery(await searchParams);
  const [result, facets, tz, jar] = await Promise.all([
    searchContacts(query),
    getContactFacets(toFilters(query)),
    getRequestTimeZone(),
    cookies(),
  ]);
  // A stale ?page=999 lands on the last page, with the URL saying so (spec 8.9).
  const page = clampPage(query.page, result.matching, query.size);
  if (page !== query.page)
    redirect(serializeListQuery('/contacts', { ...query, page }));

  return (
    // md+: the page fills the viewport (main's 34px padding aside) and the table scrolls inside it.
    <div className={listPageFrame}>
      <PageHeader
        title="Contacts"
        meta={`${fmt(result.matching)} of ${fmt(result.total)}`}
        actions={<NewContactLink />}
      />
      <ContactsView
        rows={toListRows(result.rows, todayIn(tz), tz)}
        total={result.total}
        matching={result.matching}
        facets={facets}
        page={page}
        pageSize={query.size}
        // The panel opens as the user left it (desktop only; the client ignores this on narrow screens).
        filtersOpen={jar.get('filters_open')?.value === '1'}
      />
    </div>
  );
}
