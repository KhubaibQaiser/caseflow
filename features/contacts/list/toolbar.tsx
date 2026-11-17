'use client';

import ListFilter from 'lucide-react/icons/list-filter';
import LoaderCircle from 'lucide-react/icons/loader-circle';
import Search from 'lucide-react/icons/search';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
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
  /** Omitted on the error screen, where the counts are unknown. */
  facets?: ContactFacets;
  isPending: boolean;
  /** Omitted on the error screen: the panel needs the facets that failed to load. */
  panel?: FiltersPanelState;
  filtersButton: RefObject<HTMLButtonElement | null>;
  /** Hover or focus on the Filters button: start loading the panel's code. */
  onFiltersIntent?: () => void;
}) {
  const [query, setQuery] = useListQuery();
  // The box is local; the URL gets one write, 250ms after the last key. nuqs's own debounce times each key
  // separately, so q and the page reset could land apart (an extra server render with a stale page).
  const [text, setText] = useState(query.q ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // What this box last wrote (or started from): a q that differs came from outside the box.
  const lastSent = useRef(query.q ?? '');
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if ((query.q ?? '') === lastSent.current) return; // our own write echoing back
    // Chip, Clear filters, back/forward: drop any keystroke still waiting and show the URL's q.
    clearTimeout(timer.current);
    lastSent.current = query.q ?? '';
    setText(query.q ?? '');
  }, [query.q]);
  const commit = (q: string) => {
    clearTimeout(timer.current);
    // Whitespace alone never takes: the box mirrors the URL, so it empties.
    if (!q.trim()) setText('');
    lastSent.current = q.trim() ? q : '';
    setQuery({ q: q.trim() ? q : null, page: null }, { history: 'replace' });
  };
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
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => commit(next), 250);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Escape' || !text) return;
            e.preventDefault();
            setText('');
            commit('');
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
          aria-expanded={panel?.open ?? false}
          disabledReason={panel ? undefined : 'Filters load with the list.'}
          aria-controls={panel?.open ? 'filters-panel' : undefined}
          onPointerEnter={onFiltersIntent}
          onFocus={onFiltersIntent}
          onClick={() => panel?.setOpen(!panel.open)}
          className="max-md:h-9 max-md:flex-1"
        >
          <ListFilter aria-hidden className="size-4" />
          {/* One flex item, so the name reads "Filters 2 applied" and starts with the visible word (WCAG 2.5.3). */}
          <span>
            Filters
            {applied > 0 && (
              <>
                {' '}
                <span className="sr-only">{applied} applied</span>
              </>
            )}
          </span>
          {applied > 0 && (
            <span
              aria-hidden
              className="bg-accent text-on-accent rounded-pill tnum px-[7px] text-xs leading-[18px]"
            >
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
        <QuickViews counts={facets?.quickViews} />
      </div>
      <FilterChips fallbackFocus={filtersButton} />
    </div>
  );
}
