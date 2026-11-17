'use client';

import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';

import type { ContactFacets } from '@/lib/contracts/facets';
import { serializeListQuery } from '@/lib/contracts/list-query';
import type { ListQuery } from '@/lib/contracts/list-query';
import { cn } from '@/utils/cn';

import { useListQuery } from '../url-state';

const VIEWS = [
  { fu: null, label: 'All', count: 'all' },
  { fu: 'overdue', label: 'Overdue', count: 'overdue' },
  { fu: 'dueToday', label: 'Due today', count: 'dueToday' },
] as const satisfies readonly {
  fu: ListQuery['fu'];
  label: string;
  count: keyof ContactFacets['quickViews'];
}[];

/** Presets that write the follow-up filter. Links, so each view can be opened or shared. */
export function QuickViews({
  counts,
}: {
  counts?: ContactFacets['quickViews'];
}) {
  const [query, setQuery] = useListQuery();
  // The board shares this toolbar: its links stay on the board. (null outside the app router, as in tests.)
  const path = usePathname() ?? '/contacts';
  return (
    <nav aria-label="Quick views" className="shrink-0">
      <ul className="bg-track m-0 inline-flex list-none gap-0.5 rounded-lg p-0.75">
        {VIEWS.map((v) => {
          const patch = { fu: v.fu, fuFrom: null, fuTo: null };
          const n = counts?.[v.count];
          return (
            <li key={v.label}>
              <a
                href={serializeListQuery(path, {
                  ...query,
                  ...patch,
                  page: null,
                })}
                aria-current={query.fu === v.fu ? 'true' : undefined}
                onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return;
                  event.preventDefault();
                  setQuery(patch);
                }}
                // The checked segment's ink-2 outline is deliberate: it gives the state 3:1 non-text contrast (WCAG 1.4.11).
                className="text-13 text-ink-2 hover:text-ink aria-[current=true]:border-ink-2 aria-[current=true]:bg-surface aria-[current=true]:text-ink aria-[current=true]:shadow-raised rounded-ctl flex min-h-7 items-center gap-1.5 border border-transparent px-2.5 font-medium whitespace-nowrap no-underline transition-colors duration-150 forced-colors:aria-[current=true]:border-[Highlight] forced-colors:aria-[current=true]:bg-[Highlight] forced-colors:aria-[current=true]:text-[HighlightText] forced-colors:aria-[current=true]:forced-color-adjust-none"
              >
                {v.label}
                {n !== undefined && ' '}
                {n !== undefined && (
                  <span
                    className={cn(
                      'tnum',
                      v.count === 'overdue' && n > 0
                        ? 'text-overdue font-semibold'
                        : 'text-ink-2',
                    )}
                  >
                    {n.toLocaleString('en-US')}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
