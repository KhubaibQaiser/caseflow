import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/shell/page-header';
import { ContactsView } from '@/features/contacts/list/contacts-view';
import { NewContactLink } from '@/features/contacts/list/empty-states';
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
  const [result, facets, tz] = await Promise.all([
    searchContacts(query),
    getContactFacets(toFilters(query)),
    getRequestTimeZone(),
  ]);
  // A stale ?page=999 lands on the last page, with the URL saying so (spec 8.9).
  const page = clampPage(query.page, result.matching, query.size);
  if (page !== query.page)
    redirect(serializeListQuery('/contacts', { ...query, page }));

  return (
    // md+: the page fills the viewport (main's 34px padding aside) and the table scrolls inside it.
    <div className="flex flex-col gap-3 md:h-[calc(100dvh-34px)] md:min-h-[480px]">
      <PageHeader
        title="Contacts"
        meta={`${fmt(result.matching)} of ${fmt(result.total)}`}
        actions={<NewContactLink className="max-md:hidden" />}
      />
      <ContactsView
        rows={result.rows}
        total={result.total}
        matching={result.matching}
        facets={facets}
        page={page}
        pageSize={query.size}
        today={todayIn(tz)}
        tz={tz}
      />
    </div>
  );
}
