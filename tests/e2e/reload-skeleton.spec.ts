import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// A reload that takes a while shows skeleton rows in place of the old ones (after 300ms), under the real header.
// The server round trip is held open with page.route so the skeleton can be seen, then released.

async function slow(page: Page, url: RegExp, ms = 3000) {
  await page.route(url, async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

test('contacts: skeleton rows replace the rows during a slow search, with no spinner', async ({
  page,
}) => {
  await page.goto('/contacts');
  await page.waitForLoadState('networkidle');
  await slow(page, /[?&]q=okafor(&|$)/);
  await page.getByRole('searchbox').fill('okafor');
  const region = page.locator('main [aria-busy="true"]');
  await expect(region).toBeVisible();
  await expect(region.locator('tbody .animate-pulse').first()).toBeVisible();
  // The header stays; the search has no spinner.
  await expect(
    page.getByRole('columnheader', { name: 'Follow-up' }),
  ).toBeVisible();
  await expect(page.getByRole('search').locator('.animate-spin')).toHaveCount(
    0,
  );
  await expect(page.locator('tbody .animate-pulse')).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(page.locator('tbody tr a').first()).toContainText(/okafor/i);
});

test('contacts: a fast reload never shows the skeleton', async ({ page }) => {
  await page.goto('/contacts');
  await page.waitForLoadState('networkidle');
  let seen = false;
  await page.exposeFunction('sawSkeleton', () => (seen = true));
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.querySelector('tbody .animate-pulse'))
        void (window as never as { sawSkeleton(): void }).sawSkeleton();
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole('searchbox').fill('okafor');
  await expect(page).toHaveURL(/q=okafor/);
  await page.waitForLoadState('networkidle');
  expect(seen).toBe(false);
});

test('pipeline: sorting one column shows skeleton cards in that column only', async ({
  page,
}) => {
  await page.goto('/pipeline');
  await page.waitForLoadState('networkidle');
  await slow(page, /[?&]leadSort=name(&|$)/);
  const col = (n: string) =>
    page.getByRole('main').getByRole('region', { name: new RegExp(`^${n}`) });
  await col('Lead').getByRole('button', { name: 'Sort Lead: Urgency' }).click();
  await page.getByRole('menuitemradio', { name: 'Name A–Z' }).click();
  await expect(col('Lead').locator('.animate-pulse').first()).toBeVisible();
  await expect(col('Active').locator('.animate-pulse')).toHaveCount(0);
  await expect(col('Closed').locator('.animate-pulse')).toHaveCount(0);
  await expect(col('Lead').locator('.animate-pulse')).toHaveCount(0, {
    timeout: 10_000,
  });
});
