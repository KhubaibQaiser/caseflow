import { expect, test } from '@playwright/test';

import { storage, openThemeMenu } from './helpers';

const isDark = (rgb: string) =>
  rgb
    .match(/\d+/g)!
    .map(Number)
    .reduce((a, b) => a + b) < 150;
const canvas = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.use({ colorScheme: 'light' });

test('switching to Dark applies at once and survives a reload with no flash', async ({
  page,
}) => {
  await page.goto('/contacts');
  await openThemeMenu(page);
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('menu')).toHaveCount(0);
  expect(isDark(await canvas(page))).toBe(true);

  // The server HTML already carries the attribute: nothing waits on client JS.
  const html = await (await page.request.get('/contacts')).text();
  expect(html).toMatch(/<html[^>]*data-theme="dark"/);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Theme: Dark' })).toBeVisible();
  expect(isDark(await canvas(page))).toBe(true);

  const cookie = (await page.context().cookies()).find(
    (c) => c.name === 'theme',
  );
  expect(cookie).toMatchObject({
    value: 'dark',
    sameSite: 'Lax',
    httpOnly: false,
  });
  expect(cookie!.expires - Date.now() / 1000).toBeGreaterThan(364 * 86400);
});

test('System follows the emulated colour scheme, with no attribute', async ({
  page,
}) => {
  await page.goto('/contacts');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  expect(isDark(await canvas(page))).toBe(false);
  await expect(
    page.getByRole('button', { name: 'Theme: System (light)' }),
  ).toBeVisible();
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(isDark(await canvas(page))).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Theme: System (dark)' }),
  ).toBeVisible();
});

test('an explicit Light wins over a dark OS', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/contacts');
  await openThemeMenu(page);
  await page.getByRole('menuitemradio', { name: 'Light' }).click();
  expect(isDark(await canvas(page))).toBe(false);
});

test('Esc closes the menu and returns focus to the button', async ({
  page,
}) => {
  await page.goto('/contacts');
  const button = page.getByRole('button', { name: /^Theme/ });
  await openThemeMenu(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(button).toBeFocused();
});

test.describe('signed out', () => {
  test.use({ storageState: storage.signedOut });

  test('/login shows the toggle and the email field keeps focus', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /^Theme/ })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeFocused();
  });
});
