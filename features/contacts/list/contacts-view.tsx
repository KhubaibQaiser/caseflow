'use client';

import type { ContactRow } from '@/lib/contracts/contact';
import type { ContactFacets } from '@/lib/contracts/facets';

import { ListTransition, useListQuery } from '../url-state';
import { nextSort } from './columns';
import { ContactCards } from './contact-cards';
import { ContactsTable } from './contacts-table';
import { Filtered, FirstRun } from './empty-states';
import { Pagination } from './pagination';
import { Toolbar } from './toolbar';

type ContactsViewProps = {
  rows: ContactRow[];
  total: number;
  matching: number;
  facets: ContactFacets;
  /** The page these rows are (already clamped on the server). */
  page: number;
  pageSize: number;
  today: string;
  tz: string;
};

export function ContactsView(props: ContactsViewProps) {
  return (
    <ListTransition>
      <Results {...props} />
    </ListTransition>
  );
}

function Results({
  rows,
  total,
  matching,
  facets,
  page,
  pageSize,
  today,
  tz,
}: ContactsViewProps) {
  const [query, setQuery, isPending] = useListQuery();
  const offset = (page - 1) * pageSize;
  return (
    <>
      <Toolbar facets={facets} isPending={isPending} />
      <p role="status" className="sr-only">
        {matching.toLocaleString('en-US')}{' '}
        {matching === 1 ? 'contact' : 'contacts'}
      </p>
      {total === 0 ? (
        <FirstRun />
      ) : matching === 0 ? (
        <Filtered />
      ) : (
        <>
          {/* Old rows stay and dim while the next ones load, so nothing jumps (spec 8.8). */}
          <div
            aria-busy={isPending || undefined}
            className="flex min-h-0 flex-1 flex-col transition-opacity duration-150 aria-busy:opacity-60 motion-reduce:transition-none"
          >
            <ContactsTable
              className="hidden flex-1 md:block"
              rows={rows}
              matching={matching}
              offset={offset}
              sort={query.sort}
              dir={query.dir}
              onSort={(key) => setQuery(nextSort(query, key))}
              today={today}
              tz={tz}
            />
            <ContactCards
              className="md:hidden"
              rows={rows}
              today={today}
              offset={offset}
              matching={matching}
            />
          </div>
          <Pagination
            page={query.page}
            pageSize={query.size}
            matching={matching}
          />
        </>
      )}
    </>
  );
}
