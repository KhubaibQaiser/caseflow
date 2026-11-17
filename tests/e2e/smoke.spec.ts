import { expect, test } from '@playwright/test';

import { signInAs, storage } from './helpers';

// Read-only, so it is safe against a live deployment: BASE_URL=https://... pnpm e2e smoke
test.use({ storageState: storage.signedOut });

test('the Viewer signs in and the contacts table has rows', async ({
  page,
}) => {
  await signInAs(page, 'viewer');
  await page.goto('/contacts');
  await expect(page.getByRole('table')).toBeVisible();
  expect(
    await page.getByRole('table').getByRole('row').count(),
  ).toBeGreaterThan(1);
});
