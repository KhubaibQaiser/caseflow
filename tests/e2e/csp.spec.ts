import { expect, test, type Page } from '@playwright/test';

import { storage } from './helpers';

// Collects every CSP violation (event) and console error while a page loads and is used.
async function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      console.error(
        `CSP ${e.violatedDirective} blocked ${e.blockedURI || 'inline'} at ${e.sourceFile}:${e.lineNumber} ${e.sample}`,
      ),
    );
  });
  return problems;
}

async function open(page: Page, path: string) {
  const res = await page.goto(path);
  const csp = res?.headers()['content-security-policy'] ?? '';
  expect(csp, `${path} CSP`).toMatch(/script-src 'self' 'nonce-[^']+'/);
  expect(res?.headers()['x-content-type-options']).toBe('nosniff');
  expect(res?.headers()['x-powered-by']).toBeUndefined();
  await page.waitForLoadState('networkidle');
}

test.describe('signed out', () => {
  test.use({ storageState: storage.signedOut });

  test('/login is dynamic, nonced and hydrates', async ({ page }) => {
    const problems = await watch(page);
    await open(page, '/login');
    await page.getByLabel('Email').fill('x@y.test');
    await expect(page.getByLabel('Email')).toHaveValue('x@y.test'); // hydrated
    expect(problems).toEqual([]);
  });

  test('the sign-in redirect carries the CSP', async ({ request }) => {
    const res = await request.get('/contacts', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()['content-security-policy']).toContain(
      "default-src 'self'",
    );
  });
});

test('/contacts hydrates, and the filters panel opens', async ({ page }) => {
  const problems = await watch(page);
  await open(page, '/contacts');
  await page.getByRole('button', { name: /^Filters/ }).click();
  const panel = page.getByRole('complementary', { name: 'Filters' });
  await expect(panel.or(page.getByRole('dialog'))).toBeVisible();
  await page.keyboard.press('Escape');
  expect(problems).toEqual([]);
});

test('/contacts/new opens the date picker', async ({ page }) => {
  const problems = await watch(page);
  await open(page, '/contacts/new');
  await page.getByRole('button', { name: /Next follow-up/ }).click();
  await expect(page.getByRole('grid')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(problems).toEqual([]);
});

test('a contact edit form loads clean', async ({ page }) => {
  const problems = await watch(page);
  await open(page, '/contacts');
  const href = await page
    .getByRole('link', { name: /./ })
    .evaluateAll(
      (as) =>
        as
          .map((a) => a.getAttribute('href') ?? '')
          .find((h) => /^\/contacts\/c-[^/]+$/.test(h)) ?? '',
    );
  expect(href).not.toBe('');
  await open(page, `${href}/edit`);
  await page.getByRole('button', { name: /Next follow-up/ }).click();
  await expect(page.getByRole('grid')).toBeVisible();
  expect(problems).toEqual([]);
});

test('/pipeline opens a Move menu and loads 50 more', async ({ page }) => {
  const problems = await watch(page);
  await open(page, '/pipeline');
  await page
    .getByRole('button', { name: /Move to/ })
    .first()
    .click();
  await expect(page.getByRole('menuitem').first()).toBeVisible();
  await page.keyboard.press('Escape');
  const lead = page.getByRole('region', { name: /^Lead/ });
  await lead.getByRole('button', { name: /Show 50 more/ }).click();
  await expect(
    lead.getByRole('list', { name: 'Lead contacts' }).getByRole('listitem'),
  ).toHaveCount(100);
  expect(problems).toEqual([]);
});

test('/no-such-page (the static-by-default 404) is nonced and clean', async ({
  page,
}) => {
  const problems = await watch(page);
  const res = await page.goto('/no-such-page');
  expect(res?.headers()['content-security-policy']).toContain('nonce-');
  await expect(
    page.getByRole('heading', { name: 'Page not found.' }),
  ).toBeVisible();
  // The 404 status itself logs a resource error; only CSP problems count here.
  expect(
    problems.filter(
      (p) =>
        p !==
        'console: Failed to load resource: the server responded with a status of 404 (Not Found)',
    ),
  ).toEqual([]);
});

test('@mobile the sort menu opens', async ({ page }) => {
  const problems = await watch(page);
  await open(page, '/contacts');
  await page.getByRole('button', { name: /^Sort:/ }).click();
  await expect(page.getByRole('menuitemradio').first()).toBeVisible();
  expect(problems).toEqual([]);
});
