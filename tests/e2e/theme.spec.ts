import { expect, test } from '@playwright/test';

import { storage } from './helpers';

const DARK_CANVAS = 'rgb(15, 21, 18)';
const LIGHT_CANVAS = 'rgb(244, 246, 243)';
const canvas = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.use({ colorScheme: 'light' });

test('switching to Dark applies at once and survives a reload with no flash', async ({
  page,
}) => {
  await page.goto('/contacts');
  await page.getByRole('button', { name: /^Theme/ }).click();
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('menu')).toHaveCount(0);
  expect(await canvas(page)).toBe(DARK_CANVAS);

  // The server HTML already carries the attribute: nothing waits on client JS.
  const html = await (await page.request.get('/contacts')).text();
  expect(html).toMatch(/<html[^>]*data-theme="dark"/);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Theme: Dark' })).toBeVisible();
  expect(await canvas(page)).toBe(DARK_CANVAS);

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
  expect(await canvas(page)).toBe(LIGHT_CANVAS);
  await expect(
    page.getByRole('button', { name: 'Theme: System (light)' }),
  ).toBeVisible();
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await canvas(page)).toBe(DARK_CANVAS);
  await expect(
    page.getByRole('button', { name: 'Theme: System (dark)' }),
  ).toBeVisible();
});

test('an explicit Light wins over a dark OS', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/contacts');
  await page.getByRole('button', { name: /^Theme/ }).click();
  await page.getByRole('menuitemradio', { name: 'Light' }).click();
  expect(await canvas(page)).toBe(LIGHT_CANVAS);
});

test('Esc closes the menu and returns focus to the button', async ({
  page,
}) => {
  await page.goto('/contacts');
  const button = page.getByRole('button', { name: /^Theme/ });
  await button.click();
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
