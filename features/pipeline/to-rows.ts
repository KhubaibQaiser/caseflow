import type { ContactRow } from '@/lib/contracts/contact';
import { formatDateShort, followUpView } from '@/lib/dates/labels';
import { urgencyOf } from '@/lib/dates/urgency';

import type { FollowUpView, PipelineRow } from './rows';

const RANK = { overdue: 0, today: 1, dated: 2, closedDated: 3, none: 4 };

/** Server only. Each row is labelled as an open and as a Closed contact. */
export function toPipelineRows(
  rows: ContactRow[],
  today: string,
): PipelineRow[] {
  return rows.map((r) => {
    // A Closed row never shows as overdue or due today, so every row is labelled as an open one here.
    const { urgency, daysOverdue } = urgencyOf('lead', r.followUpOn, today);
    const open: FollowUpView = {
      ...followUpView(
        {
          status: 'lead',
          followUpOn: r.followUpOn,
          urgency,
          daysOverdue,
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
