import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useRef } from 'react';

import { useDocumentTop } from '@/components/use-document-top';

import type { ListRow } from './list-rows';

/** The height a card is assumed to have until it is measured: about 72px, with its padding and divider. */
const CARD_HEIGHT = 72;
/** Cards drawn beyond the window, so Tab can move into the next card without a gap. */
const OVERSCAN = 8;

/**
 * The window-virtualized phone card list: which cards are drawn, where they sit, and how tall the list is.
 * The list scrolls with the window, so the list's own position in the page is part of the calculation.
 */
export function useContactCards({ rows }: { rows: ListRow[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const scrollMargin = useDocumentTop(listRef, rows);
  const getItemKey = useCallback(
    (index: number) => rows[index]?.id ?? index,
    [rows],
  );
  // A card's own height from its border box, rounded. A hidden list (on desktop) measures 0, so keep the estimate then.
  const measureElement = useCallback(
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
    measureElement,
    // The server draws a first phone screen, so the first cards paint before hydration.
    initialRect: { width: 390, height: 844 },
  });
  return {
    listRef,
    items: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    scrollMargin,
    measureElement: virtualizer.measureElement,
  };
}
