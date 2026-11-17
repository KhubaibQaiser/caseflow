'use client';

import ChevronDown from 'lucide-react/icons/chevron-down';
import ChevronLeft from 'lucide-react/icons/chevron-left';
import ChevronRight from 'lucide-react/icons/chevron-right';
import type { MouseEvent } from 'react';

import { PAGE_SIZES, serializeListQuery } from '@/lib/contracts/list-query';
import { cn } from '@/utils/cn';

import { useListQuery } from '../url-state';

const fmt = (n: number) => n.toLocaleString('en-US');

/** Seven slots at most, so the pager keeps its width: 1 … 5 6 7 … 12. */
export function pageItems(page: number, last: number): (number | '…')[] {
  const range = (a: number, b: number) =>
    Array.from({ length: b - a + 1 }, (_, i) => a + i);
  if (last <= 7) return range(1, last);
  if (page <= 4) return [...range(1, 5), '…', last];
  if (page >= last - 3) return [1, '…', ...range(last - 4, last)];
  return [1, '…', page - 1, page, page + 1, '…', last];
}

/** Back to the top of the new page, with focus on the table caption (or the card list on mobile). */
function revealResults() {
  for (const el of document.querySelectorAll<HTMLElement>(
    '[data-results-scroll]',
  ))
    el.scrollTop = 0;
  for (const el of document.querySelectorAll<HTMLElement>(
    '[data-results-focus]',
  )) {
    // A hidden (display: none) candidate can't take focus; try the next one.
    el.focus({ preventScroll: true });
    if (document.activeElement !== el) continue;
    if (!el.closest('[data-results-scroll]'))
      el.scrollIntoView?.({ block: 'start' });
    return;
  }
}

const item =
  'grid h-7 min-w-7 place-items-center rounded-ctl px-1 text-ink no-underline transition-colors duration-150';

export function Pagination({
  page,
  pageSize,
  matching,
}: {
  page: number;
  pageSize: number;
  matching: number;
}) {
  const [query, setQuery] = useListQuery();
  const last = Math.max(1, Math.ceil(matching / pageSize));
  const from = Math.min((page - 1) * pageSize + 1, matching);
  const to = Math.min(page * pageSize, matching);

  // Real links, so a new tab or no JS still works; a plain click stays in the transition.
  const link = (target: number) => ({
    href: serializeListQuery('/contacts', { ...query, page: target }),
    onClick(event: MouseEvent<HTMLAnchorElement>) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      setQuery({ page: target });
      revealResults();
    },
  });
  const step = (target: number, label: string, Icon: typeof ChevronLeft) =>
    target < 1 || target > last ? (
      // A link with nowhere to go: still announced, not focusable.
      <span
        role="link"
        aria-disabled="true"
        aria-label={label}
        className={cn(item, 'text-ink-2 cursor-not-allowed opacity-45')}
      >
        <Icon aria-hidden className="size-4" />
      </span>
    ) : (
      <a
        {...link(target)}
        aria-label={label}
        className={cn(item, 'hover:bg-track')}
      >
        <Icon aria-hidden className="size-4" />
      </a>
    );

  return (
    <div className="text-13 text-ink-2 tnum flex flex-wrap items-center gap-x-4 gap-y-2 max-md:justify-between">
      <span>
        {fmt(from)}–{fmt(to)} of {fmt(matching)}
      </span>
      <label className="relative inline-flex items-center">
        <span className="sr-only">Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => {
            const size = PAGE_SIZES.find((n) => String(n) === e.target.value);
            if (size) setQuery({ size });
          }}
          className="border-line bg-surface text-ink rounded-ctl hover:border-lead-border h-7 cursor-pointer appearance-none border pr-7 pl-2 transition-colors duration-150"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="text-ink-2 pointer-events-none absolute right-2 size-3.5"
        />
      </label>
      {last > 1 && (
        <nav
          aria-label="Pagination"
          className="ml-auto max-md:ml-0 max-md:w-full"
        >
          <ul className="m-0 flex list-none items-center gap-0.5 p-0 max-md:justify-center">
            <li>{step(page - 1, 'Previous page', ChevronLeft)}</li>
            {pageItems(page, last).map((p, i) => (
              <li key={p === '…' ? `gap-${i}` : p}>
                {p === '…' ? (
                  <span aria-hidden className={cn(item, 'text-ink-2')}>
                    …
                  </span>
                ) : (
                  <a
                    {...link(p)}
                    aria-label={`Page ${p}`}
                    aria-current={p === page ? 'page' : undefined}
                    className={cn(
                      item,
                      p === page
                        ? 'bg-accent text-on-accent font-semibold forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] forced-colors:forced-color-adjust-none'
                        : 'hover:bg-track',
                    )}
                  >
                    {p}
                  </a>
                )}
              </li>
            ))}
            <li>{step(page + 1, 'Next page', ChevronRight)}</li>
          </ul>
        </nav>
      )}
    </div>
  );
}
