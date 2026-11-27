'use client';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { RefObject } from 'react';

import { PhoneLink } from '@/components/ui/phone-link';
import { StatusPill, UrgencyPill } from '@/components/ui/pill';
import { cn } from '@/utils/cn';

import { matterLabel } from './columns';
import type { ListRow } from './list-rows';

/** A card's content box: 72px, less its 20px padding and the 1px divider. Used until a card is measured. */
const CARD_HEIGHT = 72;
/** Cards drawn beyond the window, so Tab can move into the next card without a gap. */
const OVERSCAN = 8;

/**
 * The list's top edge in the document. The window scrolls, so the virtualizer needs this offset.
 * It is read when the rows change (a new query can change the toolbar above) and on resize (the breakpoint moves the list).
 * Not on every scroll frame: reading layout each frame would cost the phone the work this list exists to save.
 */
function useDocumentTop(
  ref: RefObject<HTMLElement | null>,
  rows: readonly unknown[],
) {
  const [top, setTop] = useState(0);
  const read = useCallback(() => {
    const next = Math.round(
      (ref.current?.getBoundingClientRect().top ?? 0) + window.scrollY,
    );
    setTop((prev) => (prev === next ? prev : next));
  }, [ref]);
  useLayoutEffect(() => {
    read();
  }, [read, rows]);
  useEffect(() => {
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, [read]);
  return top;
}

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
 * in the page. Each card is measured once it renders; CARD_HEIGHT is the estimate until then.
 */
export function ContactCards({
  rows,
  offset,
  matching,
  className,
}: ContactCardsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const scrollMargin = useDocumentTop(listRef, rows);
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => CARD_HEIGHT,
    overscan: OVERSCAN,
    scrollMargin,
    getItemKey: (index) => rows[index]?.id ?? index,
    // A hidden list (on desktop) measures 0. Keep the estimate then, so only a window is ever drawn.
    measureElement: (el) => el.getBoundingClientRect().height || CARD_HEIGHT,
    // The server draws a first phone screen, so the first cards paint before hydration.
    initialRect: { width: 390, height: 844 },
  });

  return (
    <ul
      ref={listRef}
      aria-label="Contacts"
      tabIndex={-1}
      data-results-focus
      style={{ height: virtualizer.getTotalSize() }}
      className={cn(
        'border-line bg-surface rounded-surface tnum relative m-0 box-content list-none overflow-hidden border p-0 outline-none',
        className,
      )}
    >
      {virtualizer.getVirtualItems().map((item) => {
        const r = rows[item.index];
        if (r === undefined)
          throw new Error(
            `Contact card ${item.index} is missing from its page`,
          );
        return (
          <li
            key={item.key}
            ref={virtualizer.measureElement}
            data-index={item.index}
            aria-posinset={matching ? offset + item.index + 1 : undefined}
            aria-setsize={matching}
            style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
            className={cn(
              'hover:bg-panel text-13 border-line-soft absolute inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.75 px-3 py-2.5',
              item.index > 0 && 'border-t',
            )}
          >
            {/* The link's ::after covers the card, so the whole card is the target. */}
            <Link
              href={`/contacts/${r.id}`}
              prefetch={false}
              title={r.fullName}
              className="text-ink block truncate text-sm leading-6 font-semibold no-underline after:absolute after:inset-0 focus-visible:shadow-none focus-visible:-outline-offset-2"
            >
              {r.fullName}
            </Link>
            <UrgencyPill {...r.followUp} />
            <span className="text-ink-2 col-span-2 flex min-w-0 items-center gap-2">
              <span className="truncate">{matterLabel(r)}</span>
              <StatusPill status={r.status} />
              {r.phone ? (
                <PhoneLink phone={r.phone} />
              ) : (
                <span className="shrink-0">No phone</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
