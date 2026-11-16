import { defineConfig, devices } from '@playwright/test';

// BASE_URL points the suite at an already-running deployment (the post-deploy smoke test).
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/e2e',
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'pnpm build && pnpm start',
        url: baseURL,
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
    { name: 'mobile', use: { ...devices['iPhone 13'] }, grep: /@mobile/ },
  ],
});
