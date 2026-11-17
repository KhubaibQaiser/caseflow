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
  await expect(summary).toContainText('3 fields need attention.');
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

test('a dirty form asks before the sidebar leaves it', async ({
  page,
  context,
  baseURL,
}) => {
  await asRole(context, baseURL, 'admin');
  await page.goto('/contacts/new');
  await page.getByRole('textbox', { name: /Full name/ }).fill('Ana Díaz');
  await page.getByRole('link', { name: 'Pipeline' }).click();
  const dialog = page.getByRole('dialog', { name: 'Discard changes?' });
  await expect(dialog).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);

  await dialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(/\/contacts\/new$/);
  await expect(page.getByRole('textbox', { name: /Full name/ })).toHaveValue(
    'Ana Díaz',
  );
  await page.getByRole('link', { name: 'Pipeline' }).click();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page).toHaveURL(/\/pipeline$/);
});
