import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDelayedFlag } from './use-delayed-flag';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDelayedFlag', () => {
  it('turns on only after the delay', () => {
    const { result } = renderHook(() => useDelayedFlag(true, 300));
    expect(result.current).toBe(false);
    act(() => void vi.advanceTimersByTime(299));
    expect(result.current).toBe(false);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
  });

  it('never shows when the flag drops first', () => {
    const { result, rerender } = renderHook(
      ({ on }) => useDelayedFlag(on, 300),
      { initialProps: { on: true } },
    );
    act(() => void vi.advanceTimersByTime(200));
    rerender({ on: false });
    act(() => void vi.advanceTimersByTime(500));
    expect(result.current).toBe(false);
  });

  it('turns off at once', () => {
    const { result, rerender } = renderHook(
      ({ on }) => useDelayedFlag(on, 300),
      { initialProps: { on: true } },
    );
    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe(true);
    rerender({ on: false });
    expect(result.current).toBe(false);
  });
});
