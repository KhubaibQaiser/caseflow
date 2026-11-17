import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Headroom } from './headroom';
import { headroomStep } from './use-headroom';
import type { HeadroomState } from './use-headroom';

const start: HeadroomState = { hidden: false, peak: 0, lastY: 0 };
const H = 100;
/** Feeds scroll positions in order and returns every state reached. */
const run = (ys: number[], hold = false, from = start) =>
  ys.reduce<HeadroomState[]>(
    (acc, y) => [...acc, headroomStep(acc.at(-1) ?? from, y, H, hold)],
    [],
  );

describe('headroomStep', () => {
  it('stays shown until the scroll is more than 8px past the height', () => {
    const s = run([60, 108, 109]);
    expect(s.map((x) => x.hidden)).toEqual([false, false, true]);
  });

  it('shows again after scrolling up more than 8px, not before', () => {
    const s = run([300, 295, 292, 291]);
    expect(s.map((x) => x.hidden)).toEqual([true, true, true, false]);
  });

  it('always shows under 24px', () => {
    const hidden = run([300])[0]!;
    expect(headroomStep(hidden, 23, H, false).hidden).toBe(false);
  });

  it('never hides while focus is inside, a menu is open or the keyboard resizes', () => {
    expect(run([300, 400], true).every((x) => !x.hidden)).toBe(true);
    // Holding also brings back a header that was already hidden.
    const hidden = run([300])[0]!;
    expect(headroomStep(hidden, 301, H, true).hidden).toBe(false);
  });
});

describe('Headroom', () => {
  afterEach(() => vi.unstubAllGlobals());

  const mount = (reduced: boolean) => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: reduced && q.includes('reduce'),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    const view = render(
      <Headroom title={<h1>Contacts</h1>}>
        <input aria-label="Search" />
      </Headroom>,
    );
    return view.container.firstElementChild as HTMLElement;
  };
  const scrollTo = (y: number) =>
    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: y,
        configurable: true,
      });
      window.dispatchEvent(new Event('scroll'));
    });

  it('hides with inert and aria-hidden on scroll down, and animates', () => {
    const el = mount(false);
    scrollTo(400);
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveAttribute('inert');
    expect(el.className).toContain('duration-200');
    scrollTo(300);
    expect(el).not.toHaveAttribute('inert');
  });

  it('snaps with no transition under reduced motion', () => {
    const el = mount(true);
    expect(el.className).not.toContain('duration-200');
  });

  it('stays while focus is inside', () => {
    const el = mount(false);
    el.querySelector('input')!.focus();
    scrollTo(400);
    expect(el).not.toHaveAttribute('inert');
  });
});
