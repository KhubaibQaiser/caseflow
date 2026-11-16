import { addDays, format, parse } from 'date-fns';

const FMT = 'yyyy-MM-dd';

export const toDateOnly = (d: Date): string => format(d, FMT);

export const parseDateOnly = (s: string): Date => parse(s, FMT, new Date(0));

export function resolveTimeZone(raw?: string | null): string {
  if (!raw) return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: raw });
    return raw;
  } catch {
    return 'UTC';
  }
}

// Built from parts so it doesn't depend on a locale's date order.
export function todayIn(tz: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export const addDaysDateOnly = (s: string, n: number): string =>
  toDateOnly(addDays(parseDateOnly(s), n));
