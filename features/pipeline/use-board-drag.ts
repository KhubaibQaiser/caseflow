import { useSyncExternalStore } from 'react';

import { STATUSES } from '@/lib/contracts/enums';
import type { Status } from '@/lib/contracts/enums';

import type { PipelineRow } from './rows';

/** Cards drag from here up, where the board shows all three columns (ADR-0014). */
export const WIDE_BOARD = '(min-width: 768px)';
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** What a draggable card carries, so a drop and its announcements know the contact and where it came from. */
export type CardData = { row: PipelineRow };

/** A media query's live answer. The server can't know, so it says no and cards render undraggable until hydration. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const asStatus = (id: string | number | null | undefined) =>
  STATUSES.find((s) => s === id) ?? null;

/** The column a drop moves the card to, or null when it changes nothing. */
export function dropStatus(
  from: Status,
  target: string | number | null | undefined,
  canceled: boolean,
): Status | null {
  const to = asStatus(target);
  return canceled || to === from ? null : to;
}

/** One keyboard step: the distance between the first two columns' left edges. */
export function columnPitch(lefts: number[]): number {
  const [first, second] = lefts;
  return first === undefined || second === undefined ? 0 : second - first;
}
