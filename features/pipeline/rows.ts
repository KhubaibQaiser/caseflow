import type { ContactRow } from '@/lib/contracts/contact';
import { STATUSES } from '@/lib/contracts/enums';
import type { Status } from '@/lib/contracts/enums';
import type { FollowUpTone } from '@/lib/dates/labels';

export const PAGE_SIZE = 50;

/** A follow-up as the card shows it, with its place in the urgency order (0 overdue … 4 none). */
export type FollowUpView = { tone: FollowUpTone; text: string; rank: number };

/**
 * A row with its follow-up worked out for both an open and a Closed contact, so a move
 * can relabel the card on the client without date-fns or the time zone (they stay on the server).
 */
export type PipelineRow = ContactRow & {
  open: FollowUpView;
  closed: FollowUpView;
};

export type ColumnData = {
  rows: PipelineRow[];
  matching: number;
  /** 50-row server pages fetched so far. The RPC pages by number, so "Show 50 more" asks for page `pages`. */
  pages: number;
};
export type Columns = Record<Status, ColumnData>;

export const followUpOf = (r: PipelineRow): FollowUpView =>
  r.status === 'closed' ? r.closed : r.open;

// Urgency order (AGENTS.md): rank, then the soonest date, then the most recently updated.
function before(a: PipelineRow, b: PipelineRow): boolean {
  const [ra, rb] = [followUpOf(a).rank, followUpOf(b).rank];
  if (ra !== rb) return ra < rb;
  if (a.followUpOn && b.followUpOn && a.followUpOn !== b.followUpOn)
    return a.followUpOn < b.followUpOn;
  return a.updatedAt > b.updatedAt;
}

/** Where a column has this id, if anywhere. */
export const columnOf = (c: Columns, id: string): Status | undefined =>
  STATUSES.find((s) => c[s].rows.some((r) => r.id === id));

/**
 * The board after moving `id` to `to`. Pure and idempotent, so the optimistic copy and the
 * confirmed copy can both apply it. Counts always move. The card joins the column only where
 * urgency puts it among rows already loaded (or when all are loaded); otherwise it is
 * counted and arrives with "Show 50 more", which keeps each column's offset honest.
 */
export function applyMove(
  columns: Columns,
  id: string,
  to: Status,
  now: string,
): Columns {
  const from = columnOf(columns, id);
  const row = from && columns[from].rows.find((r) => r.id === id);
  if (!from || !row || from === to) return columns;

  const moved: PipelineRow = { ...row, status: to, updatedAt: now };
  const target = columns[to];
  const at = target.rows.findIndex((r) => before(moved, r));
  const place =
    at >= 0
      ? at
      : target.rows.length >= target.matching
        ? target.rows.length
        : -1;
  const rows =
    place < 0
      ? target.rows
      : [...target.rows.slice(0, place), moved, ...target.rows.slice(place)];
  return {
    ...columns,
    [from]: {
      ...columns[from],
      rows: columns[from].rows.filter((r) => r.id !== id),
      matching: Math.max(0, columns[from].matching - 1),
    },
    [to]: { ...target, rows, matching: target.matching + 1 },
  };
}

/**
 * The next page of a column. Moves shift the server's pages (a card that left pulls later rows up),
 * so the action also sends the page before; rows already here win, and the merge keeps urgency order.
 */
export function appendRows(
  columns: Columns,
  status: Status,
  more: PipelineRow[],
  matching: number,
): Columns {
  const have = new Set(
    STATUSES.flatMap((s) => columns[s].rows.map((r) => r.id)),
  );
  const rows = [
    ...columns[status].rows,
    ...more.filter((r) => !have.has(r.id)),
  ].sort((a, b) => (before(a, b) ? -1 : before(b, a) ? 1 : 0));
  return {
    ...columns,
    [status]: { rows, matching, pages: columns[status].pages + 1 },
  };
}

/** Is there a page left to ask for? (Rows can be missing from a stale count; the page number is the truth.) */
export const hasMore = (c: ColumnData) =>
  c.rows.length < c.matching && c.pages * PAGE_SIZE < c.matching;
