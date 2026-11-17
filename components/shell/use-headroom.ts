'use client';

import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export type HeadroomState = { hidden: boolean; peak: number; lastY: number };

const SLACK = 8;
const TOP = 24;

/** The thresholds, pure: hide once past `height` + 8px going down; show after 8px back up, or under 24px. */
export function headroomStep(
  s: HeadroomState,
  y: number,
  height: number,
  hold: boolean,
): HeadroomState {
  if (hold || y < TOP) return { hidden: false, peak: y, lastY: y };
  if (y > s.lastY) {
    const hidden = s.hidden || y > height + SLACK;
    return { hidden, peak: hidden ? Math.max(s.peak, y) : y, lastY: y };
  }
  if (y < s.lastY && s.hidden && s.peak - y > SLACK)
    return { hidden: false, peak: y, lastY: y };
  return { ...s, lastY: y };
}

// A menu or sheet is open anywhere on the page.
const OPEN_LAYER =
  '[role="menu"][data-state="open"],[role="dialog"][data-state="open"]';

/**
 * Hides `el` as the page scrolls down and brings it back on scroll up. Passive, one rAF per burst of events.
 * `reveal` is how far (px) it moves to leave: its height, or less when something in it stays pinned.
 */
export function useHeadroom(
  el: RefObject<HTMLElement | null>,
  measure: (el: HTMLElement) => number,
): { hidden: boolean; floating: boolean; animated: boolean } {
  const [hidden, setHidden] = useState(false);
  const [floating, setFloating] = useState(false);
  const [animated, setAnimated] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setAnimated(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let state: HeadroomState = {
      hidden: false,
      peak: window.scrollY,
      lastY: window.scrollY,
    };
    // Only a phone-width layout has a floating subheader; from md up nothing may hide.
    const wide = window.matchMedia('(min-width: 768px)');
    let frame = 0;
    let keyboardUntil = 0;
    const update = () => {
      frame = 0;
      node.style.setProperty('--reveal', `${measure(node)}px`);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // Overscroll bounce reads as scrolling up at the end of the page; clamp it.
      const y = Math.max(
        0,
        max > 0 ? Math.min(window.scrollY, max) : window.scrollY,
      );
      const hold =
        wide.matches ||
        node.contains(document.activeElement) ||
        document.querySelector(OPEN_LAYER) !== null ||
        Date.now() < keyboardUntil;
      state = headroomStep(state, y, node.offsetHeight, hold);
      setHidden(state.hidden);
      setFloating(y > node.offsetHeight);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // The keyboard opening resizes the visual viewport and may scroll the page: not the reader's scroll.
    const onResize = () => {
      keyboardUntil = Date.now() + 400;
    };
    // A rotate or resize while hidden: show again, and start over from where the page is.
    const onWide = () => {
      state = { hidden: false, peak: window.scrollY, lastY: window.scrollY };
      setHidden(false);
    };
    wide.addEventListener('change', onWide);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      wide.removeEventListener('change', onWide);
      window.removeEventListener('scroll', onScroll);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [el, measure]);

  return { hidden, floating, animated };
}
