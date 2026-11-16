'use client';

import ListFilter from 'lucide-react/icons/list-filter';
import LoaderCircle from 'lucide-react/icons/loader-circle';
import Search from 'lucide-react/icons/search';
import { debounce } from 'nuqs';
import { Suspense, lazy } from 'react';
import type { RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ContactFacets } from '@/lib/contracts/facets';
import { countActiveFilterGroups, toFilters } from '@/lib/contracts/list-query';

import type { FiltersPanelState } from '../filters/use-filters-panel';
import { useListQuery } from '../url-state';
import { FilterChips } from './filter-chips';
import { QuickViews } from './quick-views';
import { sortLabel } from './columns';
import { SortButton } from './sort-button';

// Radix menu + floating-ui (~25 kB gzipped) aren't needed for first paint, and only on mobile.
const SortMenu = lazy(() =>
  import('./sort-menu').then((m) => ({ default: m.SortMenu })),
);

export const SEARCH_ID = 'contacts-search';

export function Toolbar({
  facets,
  isPending,
  panel,
  filtersButton,
  onFiltersIntent,
}: {
  facets: ContactFacets;
  isPending: boolean;
  panel: FiltersPanelState;
  filtersButton: RefObject<HTMLButtonElement | null>;
  /** Hover or focus on the Filters button: start loading the panel's code. */
  onFiltersIntent?: () => void;
}) {
  const [query, setQuery] = useListQuery();
  const applied = countActiveFilterGroups(toFilters(query));

  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center md:gap-2">
      <div role="search" className="relative w-full md:w-80">
        <label htmlFor={SEARCH_ID} className="sr-only">
          Search contacts
        </label>
        <Search
          aria-hidden
          className="text-ink-2 pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        />
        <Input
          id={SEARCH_ID}
          type="search"
          autoComplete="off"
          spellCheck={false}
          maxLength={100}
          placeholder="Search name, email, phone…"
          value={query.q ?? ''}
          // The box updates at once; the URL (and the server) follow 250ms after the last key.
          onChange={(e) =>
            setQuery(
              { q: e.target.value || null },
              { history: 'replace', limitUrlUpdates: debounce(250) },
            )
          }
          onKeyDown={(e) => {
            if (e.key !== 'Escape' || !query.q) return;
            e.preventDefault();
            setQuery({ q: null }, { history: 'replace' });
          }}
          className="h-10 pr-8 pl-8 md:h-[34px] [&::-webkit-search-cancel-button]:appearance-none"
        />
        {isPending && (
          <LoaderCircle
            aria-hidden
            className="text-ink-2 absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin motion-reduce:animate-none"
          />
        )}
      </div>
      <div className="flex gap-2">
        <Button
          ref={filtersButton}
          variant="ghost"
          aria-expanded={panel.open}
          aria-controls={panel.open ? 'filters-panel' : undefined}
          onPointerEnter={onFiltersIntent}
          onFocus={onFiltersIntent}
          // One name in every browser; a flex badge would read "Filters , 2 applied".
          aria-label={applied > 0 ? `Filters, ${applied} applied` : undefined}
          onClick={() => panel.setOpen(!panel.open)}
          className="max-md:h-9 max-md:flex-1"
        >
          <ListFilter aria-hidden className="size-4" />
          Filters
          {applied > 0 && (
            <span className="bg-accent text-on-accent rounded-pill tnum px-[7px] text-xs leading-[18px]">
              {applied}
            </span>
          )}
        </Button>
        <Suspense
          fallback={
            <SortButton
              label={sortLabel(query.sort, query.dir)}
              className="h-9 flex-1 md:hidden"
            />
          }
        >
          <SortMenu className="h-9 flex-1 md:hidden" />
        </Suspense>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
        <QuickViews counts={facets.quickViews} />
      </div>
      <FilterChips fallbackFocus={filtersButton} />
    </div>
  );
}
