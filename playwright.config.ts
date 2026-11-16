import { defineConfig, devices } from '@playwright/test';

// BASE_URL points the suite at an already-running deployment (the post-deploy smoke test).
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  forbidOnly: !!process.env.CI,
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'pnpm build && pnpm start',
        // `/` redirects to a screen that may 404 (it stalls readiness); a static file is always 200.
        url: `${baseURL}/favicon.ico`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
  use: { baseURL },
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
