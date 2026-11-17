import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { storage } from './helpers';

test.use({ storageState: storage.signedOut });

const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoAxeViolations(page: Page) {
  const axe = await new AxeBuilder({ page }).withTags(axeTags).analyze();
  expect(axe.violations).toEqual([]);
}

test('login renders the form, is axe-clean and focuses the email', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page).toHaveTitle('Sign in · Caseflow');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
  await expect(page.getByLabel('Email')).toBeFocused();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test('empty submit shows field errors and moves focus to the email', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Enter your password.')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeFocused();
  await expectNoAxeViolations(page);
});

test('reason=expired shows the session-ended banner', async ({ page }) => {
  await page.goto('/login?reason=expired&next=%2Fpipeline');
  await expect(page.getByRole('status')).toHaveText(
    'Your session ended. Sign in to pick up where you left off.',
  );
  await expect(page.locator('input[name="next"]')).toHaveValue('/pipeline');
  await expectNoAxeViolations(page);
});

test('the password toggle reveals and hides the password', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Password', { exact: true }).fill('secret-value');
  const toggle = page.getByRole('button', { name: 'Show password' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'type',
    'text',
  );
});

test('wrong credentials show one message and keep the email', async ({
  page,
}) => {
  test.skip(!process.env.SEED_ADMIN_PASSWORD, 'needs local Supabase and seed');
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@caseflow.test');
  await page.getByLabel('Password', { exact: true }).fill('definitely-wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Next's route announcer is also role=alert, so scope to the banner text.
  await expect(
    page.getByRole('alert').filter({ hasText: 'Email or password' }),
  ).toHaveText('Email or password is incorrect.');
  await expect(page.getByLabel('Email')).toHaveValue('admin@caseflow.test');
  await expect(page.getByLabel('Password', { exact: true })).toBeFocused();
});

test('signing in lands on next', async ({ page }) => {
  const password = process.env.SEED_ADMIN_PASSWORD;
  test.skip(!password, 'needs local Supabase and seed');
  await page.goto('/login?next=%2Fpipeline');
  await page.getByLabel('Email').fill('admin@caseflow.test');
  await page.getByLabel('Password', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/pipeline$/);
});
