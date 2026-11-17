import { createClient } from '@supabase/supabase-js';
import { expect, test, type BrowserContext } from '@playwright/test';

import { seedPassword, signIn, signInAs, storage } from './helpers';

test.use({ storageState: storage.signedOut });

// Kills the session the way a deleted user or a tampered cookie would.
async function corruptSession(context: BrowserContext) {
  const sb = (await context.cookies()).filter((c) => c.name.startsWith('sb-'));
  expect(sb.length).toBeGreaterThan(0);
  await context.addCookies(sb.map((c) => ({ ...c, value: 'corrupted' })));
}

test('empty submit shows field errors', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Enter your password.')).toBeVisible();
});

test('a wrong password gives one message', async ({ page }) => {
  await signIn(page, 'admin@caseflow.test', 'definitely-wrong');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Email or password' }),
  ).toHaveText('Email or password is incorrect.');
});

test('Admin signs in, lands on /contacts, and signs out', async ({ page }) => {
  await signInAs(page, 'admin');
  await expect(page).toHaveURL(/\/contacts$/);
  const side = page.getByRole('complementary');
  await expect(side.getByText('Alex Morgan')).toBeVisible();
  await side.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/contacts/new');
  await expect(page).toHaveURL(/\/login\?next=%2Fcontacts%2Fnew/);
});

test('signed in without a profile shows No access with Sign out', async ({
  page,
}) => {
  const email = `e2e-noprofile-${Date.now()}@caseflow.test`;
  const password = crypto.randomUUID();
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const made = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(made.error).toBeNull();
  try {
    await signIn(page, email, password);
    await expect(
      page.getByRole('heading', { name: 'No access.' }),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await admin.auth.admin.deleteUser(made.data.user!.id);
  }
});

// Save redirects to sign-in; the draft rides in history.state and Back restores it.
async function fillNewContact(page: import('@playwright/test').Page) {
  await page.getByRole('textbox', { name: /Full name/ }).fill('Ana Díaz');
  await page.getByRole('textbox', { name: /Email/ }).fill('ana@example.com');
  await page.getByLabel(/Matter type/).selectOption({ index: 1 });
}

test('expired session on save redirects with next', async ({
  page,
  context,
}) => {
  await signInAs(page, 'admin');
  await page.goto('/contacts/new');
  await fillNewContact(page);
  await corruptSession(context);
  await page.getByRole('button', { name: 'Save contact' }).click();
  await expect(page).toHaveURL(
    /\/login\?(reason=expired&next=%2Fcontacts%2Fnew|next=%2Fcontacts%2Fnew&reason=expired)/,
  );
  await expect(page.getByRole('status')).toContainText('Your session ended');
});

test('after expiry, signing in returns to the form with the draft', async ({
  page,
  context,
}) => {
  await signInAs(page, 'admin');
  await page.goto('/contacts/new');
  await fillNewContact(page);
  await corruptSession(context);
  await page.getByRole('button', { name: 'Save contact' }).click();
  await expect(page).toHaveURL(/\/login\?/);
  await context.clearCookies();

  await page.getByLabel('Email').fill('admin@caseflow.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(seedPassword('admin'));
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/contacts\/new$/);
  await expect(page.getByRole('textbox', { name: /Full name/ })).toHaveValue(
    'Ana Díaz',
  );
});

test('expiry on a client Link navigation signs in and lands on next', async ({
  page,
  context,
}) => {
  await signInAs(page, 'admin');
  await page.goto('/dev/toast');
  await corruptSession(context);
  await page
    .getByRole('complementary')
    .getByRole('link', { name: 'Pipeline' })
    .click();
  await expect(page).toHaveURL(/\/login\?.*reason=expired/);
  await expect(page).toHaveURL(/next=%2Fpipeline/);
  await context.clearCookies();

  await page.getByLabel('Email').fill('admin@caseflow.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(seedPassword('admin'));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/pipeline$/);
});

test('a single-entry tab on the expired login lands on next, not out of the app', async ({
  page,
}) => {
  await page.goto('/login?reason=expired&next=%2Fpipeline');
  await page.getByLabel('Email').fill('admin@caseflow.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(seedPassword('admin'));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/pipeline$/);
});
