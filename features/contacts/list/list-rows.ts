import type { ContactRow } from '@/lib/contracts/contact';
import { followUpView, waitingLabel } from '@/lib/dates/labels';
import type { FollowUpTone } from '@/lib/dates/labels';

/** A row with its date labels already worked out, so date-fns and the time zone stay on the server. */
export type ListRow = ContactRow & {
  followUp: { tone: FollowUpTone; text: string };
  waiting: string;
};

export const toListRows = (
  rows: ContactRow[],
  today: string,
  tz: string,
): ListRow[] =>
  rows.map((r) => ({
    ...r,
    followUp: followUpView(r, today),
    waiting: waitingLabel(r.createdAt, today, tz),
  }));
