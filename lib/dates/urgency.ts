import type { Status } from '@/lib/contracts/enums';

const DAY_MS = 86_400_000;
const utcDay = (s: string) => Date.parse(`${s}T00:00:00Z`);

// Only Lead and Active can be overdue or due today.
export function urgencyOf(
  status: Status,
  followUpOn: string | null,
  today: string,
): {
  urgency: 'overdue' | 'today' | 'later' | 'none';
  daysOverdue: number | null;
} {
  if (!followUpOn) return { urgency: 'none', daysOverdue: null };
  if (status !== 'closed') {
    if (followUpOn < today)
      return {
        urgency: 'overdue',
        daysOverdue: (utcDay(today) - utcDay(followUpOn)) / DAY_MS,
      };
    if (followUpOn === today) return { urgency: 'today', daysOverdue: null };
  }
  return { urgency: 'later', daysOverdue: null };
}
