import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { RefObject } from 'react';

/**
 * The top edge of an element in the document. Window-scrolled lists need this offset.
 * It is read when `deps` change, when the window resizes, and when the page's height changes
 * (a web font or a wrapped chip above the list moves it). Reads wait for a frame, and scrolling
 * never triggers one, so a scroll costs no layout work.
 */
export function useDocumentTop(
  ref: RefObject<HTMLElement | null>,
  deps: readonly unknown[],
): number {
  const [top, setTop] = useState(0);
  const frame = useRef(0);
  const read = useCallback(() => {
    const next = Math.round(
      (ref.current?.getBoundingClientRect().top ?? 0) + window.scrollY,
    );
    setTop((prev) => (prev === next ? prev : next));
  }, [ref]);
  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(read);
  }, [read]);
  useLayoutEffect(() => {
    read();
  }, [read, deps]);
  useEffect(() => {
    window.addEventListener('resize', schedule);
    // ResizeObserver reports every change in the page's height, which is what moves the element.
    // Browsers without it still get the resize listener above.
    const observer =
      'ResizeObserver' in window ? new ResizeObserver(schedule) : null;
    observer?.observe(document.body);
    return () => {
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [schedule]);
  return top;
}
