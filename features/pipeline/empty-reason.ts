import type { Status } from '@/lib/contracts/enums';
import type { Filters } from '@/lib/contracts/filters';

/** Why a column is empty when a filter makes it so: Closed contacts are never overdue or due today. */
export function emptyReason(status: Status, f: Filters): string | undefined {
  if (status !== 'closed') return undefined;
  if (f.followUp === 'overdue') return "Closed contacts can't be overdue.";
  if (f.followUp === 'dueToday') return "Closed contacts can't be due today.";
  return undefined;
}
