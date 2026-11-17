'use client';

import { useRef } from 'react';
import type { RefObject } from 'react';

import { Chip } from '@/components/ui/chip';

import { useListQuery } from '../url-state';
import { activeFilters } from './active-filters';

/** Applied filters. Removing one is instant; focus moves to the next chip, else the Filters button. */
export function FilterChips({
  fallbackFocus,
}: {
  fallbackFocus: RefObject<HTMLElement | null>;
}) {
  const [query, setQuery] = useListQuery();
  const list = useRef<HTMLUListElement>(null);
  const chips = activeFilters(query);
  if (chips.length === 0) return null;
  return (
    <ul
      ref={list}
      aria-label="Applied filters"
      className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0"
    >
      {chips.map((c, i) => (
        <li key={c.key}>
          <Chip
            label={c.label}
            value={c.value}
            onRemove={() => {
              // The other chips keep their DOM nodes (keyed by group), so focus them before this one unmounts.
              const buttons = list.current?.querySelectorAll('button');
              const next = buttons?.[i + 1] ?? buttons?.[i - 1];
              (next ?? fallbackFocus.current)?.focus();
              setQuery(c.clear);
            }}
          />
        </li>
      ))}
    </ul>
  );
}
