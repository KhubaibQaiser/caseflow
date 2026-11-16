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

// en-CA formats as YYYY-MM-DD.
export const todayIn = (tz: string, now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);

export const addDaysDateOnly = (s: string, n: number): string =>
  toDateOnly(addDays(parseDateOnly(s), n));
