import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { settleAnimations, storage } from './helpers';

const axe = async (page: import('@playwright/test').Page) => {
  await settleAnimations(page);
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
};

test('an empty submit lists every error and focuses the summary', async ({
  page,
}) => {
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

test('an unknown contact id shows the not-found screen', async ({ page }) => {
  await page.goto('/contacts/no-such-id/edit');
  // loading.tsx has already sent a 200, so assert the screen, not the status.
  await expect(
    page.getByRole('heading', { name: 'Page not found.' }),
  ).toBeVisible();
});

test.describe('as a viewer', () => {
  test.use({ storageState: storage.viewer });

  test('gets the forbidden screen on both form routes', async ({ page }) => {
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
});

test('a dirty form asks before the sidebar leaves it', async ({ page }) => {
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
