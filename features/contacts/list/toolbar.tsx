'use client';

import ListFilter from 'lucide-react/icons/list-filter';
import LoaderCircle from 'lucide-react/icons/loader-circle';
import Search from 'lucide-react/icons/search';
import { debounce } from 'nuqs';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ContactFacets } from '@/lib/contracts/facets';
import { countActiveFilterGroups, toFilters } from '@/lib/contracts/list-query';

import { useListQuery } from '../url-state';
import { FilterChips } from './filter-chips';
import { QuickViews } from './quick-views';
import { SortMenu } from './sort-menu';

export const SEARCH_ID = 'contacts-search';

export function Toolbar({
  facets,
  isPending,
}: {
  facets: ContactFacets;
  isPending: boolean;
}) {
  const [query, setQuery] = useListQuery();
  const filtersButton = useRef<HTMLButtonElement>(null);
  // ponytail: T15 lifts this to the filters panel (desktop panel, mobile sheet, cookie-remembered).
  const [filtersOpen, setFiltersOpen] = useState(false);
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
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((o) => !o)}
          className="max-md:h-9 max-md:flex-1"
        >
          <ListFilter aria-hidden className="size-4" />
          Filters
          {applied > 0 && (
            <>
              <span
                aria-hidden
                className="bg-accent text-on-accent rounded-pill tnum px-[7px] text-xs leading-[18px]"
              >
                {applied}
              </span>
              <span className="sr-only">, {applied} applied</span>
            </>
          )}
        </Button>
        <SortMenu className="h-9 flex-1 md:hidden" />
      </div>
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
        <QuickViews counts={facets.quickViews} />
      </div>
      <FilterChips fallbackFocus={filtersButton} />
    </div>
  );
}
