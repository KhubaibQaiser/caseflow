import { defineConfig, devices } from '@playwright/test';

import { storage } from './tests/e2e/helpers';

// BASE_URL points the suite at an already-running deployment (the post-deploy smoke test).
// E2E_PORT moves the local server off 3000.
const port = process.env.E2E_PORT ?? '3000';
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  forbidOnly: !!process.env.CI,
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start -p ${port}`,
        // `/` redirects to a screen that may 404 (it stalls readiness); a static file is always 200.
        url: `${baseURL}/favicon.ico`,
        // A production build 404s the /dev fixtures unless this is set (lib/env.ts devRoutesEnabled).
        env: { E2E_DEV_ROUTES: '1' },
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
  use: { baseURL, storageState: storage.admin },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 } },
      grepInvert: /@mobile/,
    },
    {
      name: 'mobile',
      // iPhone 13 viewport and UA on Chromium, so CI installs one browser.
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
      grep: /@mobile/,
    },
  ],
});
