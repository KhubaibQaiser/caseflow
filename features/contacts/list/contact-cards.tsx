'use client';

import { cn } from '@/utils/cn';

import { ContactCard } from './contact-card';
import type { ListRow } from './list-rows';
import { useContactCards } from './use-contact-cards';

type ContactCardsProps = {
  rows: ListRow[];
  /** Rows before this page, for each card's position in the whole set. */
  offset: number;
  matching?: number;
  className?: string;
};

/**
 * Below 768px. Virtualized like the desktop table, with the window as the scroll element, so the
 * header's hide-on-scroll and the footer pager keep working. Only the cards near the viewport are
 * in the page. The layout and the window maths live in useContactCards.
 */
export function ContactCards({
  rows,
  offset,
  matching,
  className,
}: ContactCardsProps) {
  const { listRef, items, totalSize, scrollMargin, measureElement } =
    useContactCards({ rows });
  return (
    <ul
      ref={listRef}
      aria-label="Contacts"
      tabIndex={-1}
      data-results-focus
      style={{ height: totalSize }}
      className={cn(
        'border-line bg-surface rounded-surface tnum relative m-0 box-content list-none overflow-hidden border p-0 outline-none',
        className,
      )}
    >
      {items.map((item) => {
        const r = rows[item.index];
        if (r === undefined)
          throw new Error(
            `Contact card ${item.index} is missing from its page`,
          );
        return (
          <li
            key={item.key}
            ref={measureElement}
            data-index={item.index}
            aria-posinset={matching ? offset + item.index + 1 : undefined}
            aria-setsize={matching}
            style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
            className={cn(
              'hover:bg-panel text-13 border-line-soft absolute inset-x-0 top-0 flex flex-col gap-y-0.75 px-3 py-2.5',
              item.index > 0 && 'border-t',
            )}
          >
            <ContactCard row={r} />
          </li>
        );
      })}
    </ul>
  );
}
