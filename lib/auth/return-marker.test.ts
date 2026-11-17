import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearReturn, hasReturn, markReturn } from './return-marker';

afterEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
});

describe('return marker', () => {
  it('matches only the path the form marked', () => {
    markReturn('/contacts/new');
    expect(hasReturn('/contacts/new')).toBe(true);
    expect(hasReturn('/contacts/other')).toBe(false);
    expect(hasReturn(undefined)).toBe(false);
  });

  it('is gone after clearReturn', () => {
    markReturn('/contacts/new');
    clearReturn();
    expect(hasReturn('/contacts/new')).toBe(false);
  });

  it('expires after ten minutes', () => {
    vi.useFakeTimers();
    markReturn('/contacts/new');
    vi.advanceTimersByTime(10 * 60_000 + 1);
    expect(hasReturn('/contacts/new')).toBe(false);
  });

  it('ignores junk in storage', () => {
    sessionStorage.setItem('caseflow:return', '{"next":5}');
    expect(hasReturn('/x')).toBe(false);
    sessionStorage.setItem('caseflow:return', 'not json');
    expect(hasReturn('/x')).toBe(false);
  });

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => markReturn('/x')).not.toThrow();
    vi.restoreAllMocks();
  });
});
