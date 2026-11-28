import { STATUS_LABEL } from '@/lib/contracts/enums';
import type { Status } from '@/lib/contracts/enums';

// Screen-reader copy for a keyboard or pointer drag (ADR-0014). A completed move says nothing here: the toast announces it.

export const DRAG_INSTRUCTIONS =
  'Press Space to pick up this contact. Use the Left and Right arrow keys to choose a column, Space to drop, Escape to cancel.';

export const startText = (name: string, from: Status) =>
  `Picked up ${name} from ${STATUS_LABEL[from]}.`;

export const overText = (name: string, over: Status | null) =>
  over
    ? `${name} is over ${STATUS_LABEL[over]}.`
    : `${name} is not over a column.`;

export function endText(
  name: string,
  from: Status,
  to: Status | null,
  canceled: boolean,
): string | undefined {
  if (canceled) return `${name} was not moved.`;
  if (to === null || to === from)
    return `${name} stays in ${STATUS_LABEL[from]}.`;
  return undefined;
}
