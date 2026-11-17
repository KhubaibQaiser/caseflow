import { z } from 'zod';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

it('keeps zod JIT on the server', async () => {
  vi.stubGlobal('window', undefined);
  await import('./zod-config');
  expect(z.config().jitless).toBeFalsy();
});

it('turns JIT off in the browser, where the CSP forbids eval', async () => {
  vi.resetModules();
  await import('./zod-config'); // jsdom has a window
  expect(z.config().jitless).toBe(true);
});
