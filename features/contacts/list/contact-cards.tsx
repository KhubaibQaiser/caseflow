'use client';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import Link from 'next/link';
import {
  memo,
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

/** The height a card is assumed to have until it is measured: about 72px, with its padding and divider. */
const CARD_HEIGHT = 72;
/** Cards drawn beyond the window, so Tab can move into the next card without a gap. */
const OVERSCAN = 8;

/**
 * The list's top edge in the document. The window scrolls, so the virtualizer needs this offset.
 * It is read when the rows change, when the window resizes, and when the page's own height changes
 * (a web font or a wrapped filter chip above the list moves it). The reads wait for a frame, and
 * scrolling never triggers one, so the list costs no layout work while the phone scrolls.
 */
function useDocumentTop(
  ref: RefObject<HTMLElement | null>,
  rows: readonly unknown[],
) {
  const [top, setTop] = useState(0);
  const frame = useRef(0);
  const read = useCallback(() => {
    const next = Math.round(
      (ref.current?.getBoundingClientRect().top ?? 0) + window.scrollY,
    );
    setTop((prev) => (prev === next ? prev : next));
  }, [ref]);
  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(read);
  }, [read]);
  useLayoutEffect(() => {
    read();
  }, [read, rows]);
  useEffect(() => {
    window.addEventListener('resize', schedule);
    // ResizeObserver reports every change in the page's height, which is what moves the list.
    // Browsers without it still get the resize listener above.
    const observer =
      'ResizeObserver' in window ? new ResizeObserver(schedule) : null;
    observer?.observe(document.body);
    return () => {
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [schedule]);
  return top;
}

/** The card's content. Memoized, so a scroll that only moves a card's position does not redraw its text. */
const CardBody = memo(function CardBody({ row: r }: { row: ListRow }) {
  return (
    <>
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
    </>
  );
});

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
  const getItemKey = useCallback(
    (index: number) => rows[index]?.id ?? index,
    [rows],
  );
  // The card's own height from its box, rounded. A hidden list (on desktop) measures 0, so keep the estimate then.
  const measureCard = useCallback(
    (el: Element, entry?: ResizeObserverEntry) => {
      const box = entry?.borderBoxSize.at(0);
      const size = box ? box.blockSize : el.getBoundingClientRect().height;
      return Math.round(size) || CARD_HEIGHT;
    },
    [],
  );
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => CARD_HEIGHT,
    overscan: OVERSCAN,
    scrollMargin,
    getItemKey,
    measureElement: measureCard,
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
            <CardBody row={r} />
          </li>
        );
      })}
    </ul>
  );
}
