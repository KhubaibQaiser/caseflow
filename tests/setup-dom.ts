import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Testing Library cannot register cleanup itself.
afterEach(cleanup);

// jsdom has no pointer capture; sonner's swipe handling calls it on pointerdown.
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;

// Lazy chunks (calendar, menu, tooltip) can take longer than the 1s default when the suite runs in parallel.
configure({ asyncUtilTimeout: 4000 });

// ProseMirror (the note editor) measures text with APIs jsdom leaves out.
const rect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  toJSON: () => ({}),
};
Range.prototype.getBoundingClientRect ??= () => rect as DOMRect;
Range.prototype.getClientRects ??= () =>
  ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: [][Symbol.iterator],
  }) as unknown as DOMRectList;
document.elementFromPoint ??= () => null;

// jsdom has no matchMedia; the theme toggle reads prefers-color-scheme. Light unless a test stubs it.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
})) as unknown as typeof window.matchMedia;
