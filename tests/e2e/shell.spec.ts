import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { settleAnimations, storage } from './helpers';

const axe = async (page: import('@playwright/test').Page) => {
  await settleAnimations(page);
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
};

test('desktop shell: sidebar, current page, role badge, skip link', async ({
  page,
}) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404); // the 404 stays a real 404 inside the shell

  const side = page.getByRole('complementary');
  await expect(side.getByRole('link', { name: 'Contacts' })).toBeVisible();
  await expect(side.getByRole('link', { name: 'Pipeline' })).toBeVisible();
  await expect(side.getByText('Alex Morgan')).toBeVisible();
  await expect(side.getByText('Admin', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Page not found.' }),
  ).toBeVisible();

  // The 404 heading holds focus, so focus the link directly.
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await skip.focus();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  expect((await axe(page)).violations).toEqual([]);
});

test.describe('as a viewer', () => {
  test.use({ storageState: storage.viewer });

  test('a viewer sees the read-only badge and the forbidden screen', async ({
    page,
  }) => {
    const response = await page.goto('/dev/forbidden');
    expect(response?.status()).toBe(403);

    await expect(
      page.getByRole('heading', { level: 1, name: "You can't do that." }),
    ).toBeFocused();
    await expect(
      page.getByText('Your role is Viewer, which is read-only.'),
    ).toBeVisible();
    await expect(
      page.getByRole('complementary').getByText('Viewer · read-only'),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Back to contacts' }),
    ).toHaveAttribute('href', '/contacts');

    expect((await axe(page)).violations).toEqual([]);
  });

  test('@mobile tab bar: sticky, Account shows the role, Viewers get no New', async ({
    page,
  }) => {
    await page.goto('/no-such-page');
    expect((await axe(page)).violations).toEqual([]);
    await page.goto('/dev/forbidden');
    expect((await axe(page)).violations).toEqual([]);
    await page.goto('/no-such-page');

    const tabs = page.getByRole('navigation', { name: 'Main' });
    await expect(tabs.getByRole('link', { name: 'Contacts' })).toBeVisible();
    await expect(tabs.getByRole('link', { name: 'Pipeline' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'New', exact: true }),
    ).toHaveCount(0);

    await tabs.getByRole('button', { name: 'Account' }).click();
    const sheet = page.getByRole('dialog', { name: 'Account' });
    await expect(sheet.getByText('Sam Patel')).toBeVisible();
    await expect(sheet.getByText('Viewer · read-only')).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tabs.getByRole('button', { name: 'Account' })).toBeFocused();
  });
});

test('an admin opens the write-only page', async ({ page }) => {
  const response = await page.goto('/dev/forbidden');
  expect(response?.status()).toBe(200);
});

test('@mobile admins get the New tab', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(
    page.getByRole('link', { name: 'New', exact: true }),
  ).toBeVisible();
});

test('@mobile a toast clears the tab bar and the safe area', async ({
  page,
}) => {
  await page.goto('/dev/toast');
  await page.getByRole('button', { name: 'Show toast' }).click();

  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible();
  await page.waitForTimeout(500); // let the enter animation settle
  const toastBox = (await toast.boundingBox())!;
  const tabBox = (await page.locator('[data-tab-bar]').boundingBox())!;
  expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(tabBox.y - 8);
});
