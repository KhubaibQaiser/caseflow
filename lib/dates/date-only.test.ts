import { describe, expect, it } from 'vitest';

import { addDaysDateOnly, parseDateOnly, resolveTimeZone, toDateOnly, todayIn } from './date-only';

describe('date-only helpers', () => {
  it('toDateOnly never shifts the date', () => {
    expect(toDateOnly(new Date(2026, 10, 16, 23, 59))).toBe('2026-11-16');
  });

  it('parseDateOnly returns local midnight', () => {
    const d = parseDateOnly('2026-11-16');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 16]);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
  });

  it('todayIn differs across extreme zones at the same instant', () => {
    const now = new Date('2026-11-16T11:30:00Z');
    expect(todayIn('Pacific/Kiritimati', now)).toBe('2026-11-17');
    expect(todayIn('Pacific/Pago_Pago', now)).toBe('2026-11-16');
  });

  it('resolveTimeZone accepts aliases and rejects junk', () => {
    expect(resolveTimeZone('Asia/Calcutta')).toBe('Asia/Calcutta');
    expect(resolveTimeZone('UTC')).toBe('UTC');
    expect(resolveTimeZone('Mars/Base')).toBe('UTC');
    expect(resolveTimeZone(null)).toBe('UTC');
    expect(resolveTimeZone(undefined)).toBe('UTC');
  });

  it('addDaysDateOnly crosses month ends and DST changes', () => {
    expect(addDaysDateOnly('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysDateOnly('2026-12-01', -1)).toBe('2026-11-30');
    expect(addDaysDateOnly('2026-03-07', 2)).toBe('2026-03-09'); // US spring forward 03-08
    expect(addDaysDateOnly('2026-10-31', 2)).toBe('2026-11-02'); // US fall back 11-01
    expect(addDaysDateOnly('2026-11-16', 0)).toBe('2026-11-16');
  });
});
