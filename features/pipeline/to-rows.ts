import { differenceInCalendarDays } from 'date-fns';

import type { ContactRow } from '@/lib/contracts/contact';
import { formatDateShort, followUpView } from '@/lib/dates/labels';
import { parseDateOnly } from '@/lib/dates/date-only';

import type { FollowUpView, PipelineRow } from './rows';

const RANK = { overdue: 0, today: 1, dated: 2, closedDated: 3, none: 4 };

/** Server only: date-fns stays out of the browser. Each row is labelled as an open and as a Closed contact. */
export function toPipelineRows(
  rows: ContactRow[],
  today: string,
): PipelineRow[] {
  return rows.map((r) => {
    const days = r.followUpOn
      ? differenceInCalendarDays(
          parseDateOnly(today),
          parseDateOnly(r.followUpOn),
        )
      : null;
    // Only Lead and Active can be overdue or due today (a Closed row arrives as 'later').
    const urgency =
      days === null
        ? 'none'
        : days > 0
          ? 'overdue'
          : days === 0
            ? 'today'
            : 'later';
    const open: FollowUpView = {
      ...followUpView(
        {
          status: 'lead',
          followUpOn: r.followUpOn,
          urgency,
          daysOverdue: days && days > 0 ? days : null,
        },
        today,
      ),
      rank:
        urgency === 'overdue'
          ? RANK.overdue
          : urgency === 'today'
            ? RANK.today
            : urgency === 'none'
              ? RANK.none
              : RANK.dated,
    };
    const closed: FollowUpView = {
      tone: 'muted',
      text: r.followUpOn ? formatDateShort(r.followUpOn, today) : 'Not set',
      rank: r.followUpOn ? RANK.closedDated : RANK.none,
    };
    return { ...r, open, closed };
  });
}
