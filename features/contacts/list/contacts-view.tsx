'use client';

import { Suspense, lazy, useRef } from 'react';

import type { ContactFacets } from '@/lib/contracts/facets';

import { useFiltersPanel } from '../filters/use-filters-panel';
import { ListTransition, useListQuery } from '../url-state';
import { nextSort } from './columns';
import { ContactCards } from './contact-cards';
import { ContactsTable } from './contacts-table';
import { Filtered, FirstRun } from './empty-states';
import type { ListRow } from './list-rows';
import { Pagination } from './pagination';
import { Toolbar } from './toolbar';

// The panel (calendar, date helpers) stays out of first load; it is fetched on hover, focus or first open.
const loadPanel = () => import('../filters/filters-panel');
const FiltersPanel = lazy(() =>
  loadPanel().then((m) => ({ default: m.FiltersPanel })),
);

type ContactsViewProps = {
  rows: ListRow[];
  total: number;
  matching: number;
  facets: ContactFacets;
  /** The page these rows are (already clamped on the server). */
  page: number;
  pageSize: number;
  /** The `filters_open` cookie, read on the server. */
  filtersOpen: boolean;
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
  filtersOpen,
}: ContactsViewProps) {
  const [query, setQuery, isPending] = useListQuery();
  const filtersButton = useRef<HTMLButtonElement>(null);
  const panel = useFiltersPanel(filtersOpen, filtersButton);
  const offset = (page - 1) * pageSize;
  return (
    <>
      {/* With no contacts at all there is nothing to search or filter. */}
      {total > 0 && (
        <Toolbar
          facets={facets}
          isPending={isPending}
          panel={panel}
          filtersButton={filtersButton}
          onFiltersIntent={() => void loadPanel()}
        />
      )}
      <p role="status" className="sr-only">
        {matching.toLocaleString('en-US')}{' '}
        {matching === 1 ? 'contact' : 'contacts'}
      </p>
      {total === 0 ? (
        <FirstRun />
      ) : (
        // The panel floats over the right edge of this region, under the toolbar, so the table never reflows.
        <div className="relative flex min-h-0 flex-1 flex-col gap-3">
          {matching === 0 ? (
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
                />
                <ContactCards
                  className="md:hidden"
                  rows={rows}
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
          {panel.mounted && (
            <Suspense fallback={null}>
              <FiltersPanel
                open={panel.open}
                onOpenChange={panel.setOpen}
                facets={facets}
                focusOnOpen={panel.focusOnOpen}
                returnFocusTo={filtersButton}
              />
            </Suspense>
          )}
        </div>
      )}
    </>
  );
}
