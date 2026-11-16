import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';

// Fake viewer until T22; saving needs the database, so T22 extends this with the save paths.
async function asRole(
  context: BrowserContext,
  baseURL: string | undefined,
  role: 'admin' | 'viewer',
) {
  await context.addCookies([{ name: 'fake-role', value: role, url: baseURL! }]);
}

const axe = (page: import('@playwright/test').Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

test('an empty submit lists every error and focuses the summary', async ({
  page,
  context,
  baseURL,
}) => {
  await asRole(context, baseURL, 'admin');
  await page.goto('/contacts/new');
  expect((await axe(page)).violations).toEqual([]);

  await page.getByRole('button', { name: 'Save contact' }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'need attention' });
  await expect(summary).toContainText('2 fields need attention.');
  await expect(summary).toBeFocused();

  await summary.getByRole('link', { name: /Email or phone/ }).click();
  await expect(page.locator('#contactMethod')).toBeFocused();
  expect((await axe(page)).violations).toEqual([]);
});

test('an unknown contact id shows the not-found screen', async ({
  page,
  context,
  baseURL,
}) => {
  await asRole(context, baseURL, 'admin');
  await page.goto('/contacts/no-such-id/edit');
  // loading.tsx has already sent a 200, so assert the screen, not the status.
  await expect(
    page.getByRole('heading', { name: 'Page not found.' }),
  ).toBeVisible();
});

test('a viewer gets the forbidden screen on both form routes', async ({
  page,
  context,
  baseURL,
}) => {
  await asRole(context, baseURL, 'viewer');
  await page.goto('/contacts/new');
  await expect(
    page.getByRole('heading', { name: "You can't add contacts." }),
  ).toBeVisible();
  await page.goto('/contacts/anything/edit');
  await expect(
    page.getByRole('heading', { name: "You can't edit contacts." }),
  ).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
});
