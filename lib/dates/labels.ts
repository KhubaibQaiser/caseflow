import { differenceInCalendarDays, format } from 'date-fns';

import type { ContactRow } from '@/lib/contracts/contact';

import { parseDateOnly, todayIn } from './date-only';

export type FollowUpTone = 'overdue' | 'today' | 'later' | 'none' | 'muted';

export function formatDateShort(dateOnly: string, today: string): string {
  const d = parseDateOnly(dateOnly);
  const sameYear = d.getFullYear() === parseDateOnly(today).getFullYear();
  return format(d, sameYear ? 'EEE, MMM d' : 'EEE, MMM d, yyyy');
}

export function followUpView(
  row: Pick<ContactRow, 'status' | 'followUpOn' | 'urgency' | 'daysOverdue'>,
  today: string,
): { tone: FollowUpTone; text: string } {
  const absolute = row.followUpOn
    ? formatDateShort(row.followUpOn, today)
    : 'Not set';
  if (row.status === 'closed') return { tone: 'muted', text: absolute };
  if (row.urgency === 'overdue')
    return { tone: 'overdue', text: `Overdue · ${row.daysOverdue ?? 0}d` };
  if (row.urgency === 'today') return { tone: 'today', text: 'Today' };
  return { tone: row.urgency, text: absolute };
}

export function waitingLabel(
  createdAt: string,
  today: string,
  tz: string,
): string {
  const created = todayIn(tz, new Date(createdAt));
  const days = Math.max(
    0,
    differenceInCalendarDays(parseDateOnly(today), parseDateOnly(created)),
  );
  return days === 0 ? 'Today' : `${days}d`;
}

export function formatTimestamp(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace(/ /g, ' ');
}

// For a <time title>: the whole moment, with its zone.
export function formatTimestampFull(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
    .format(new Date(iso))
    .replace(/\u202f/g, ' ');
}

export function formatEnquired(
  createdAt: string,
  today: string,
  tz: string,
): string {
  const d = parseDateOnly(todayIn(tz, new Date(createdAt)));
  const sameYear = d.getFullYear() === parseDateOnly(today).getFullYear();
  return format(d, sameYear ? 'MMM d' : 'MMM d, yyyy');
}
