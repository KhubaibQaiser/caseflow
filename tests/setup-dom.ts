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
