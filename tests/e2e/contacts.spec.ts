import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { storage } from './helpers';

// Runs on the fake data layer until T22 (1,200 contacts, one with a 120-character name).
const axe = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

// Scoped to main: while the page streams in, React parks a hidden copy outside it (role queries skip it, text queries don't).
const main = (page: Page) => page.getByRole('main');
const table = (page: Page) => page.getByRole('table');
// The URL moves first; the old rows stay (aria-busy, full contrast) until the new ones arrive.
const settled = (page: Page) =>
  expect(main(page).locator('[aria-busy="true"]')).toHaveCount(0);
const firstDataRow = (page: Page) => table(page).getByRole('row').nth(1);

test('the list shows counts, keeps table semantics and passes axe', async ({
  page,
}) => {
  await page.goto('/contacts');
  await expect(page).toHaveTitle('Contacts · Caseflow');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Contacts' }),
  ).toBeVisible();
  await expect(main(page).getByText('1,200 of 1,200')).toBeVisible();
  await expect(table(page)).toHaveAttribute('aria-rowcount', '1201');
  await expect(firstDataRow(page)).toHaveAttribute('aria-rowindex', '2');
  await expect(
    page.getByRole('columnheader', { name: 'Follow-up' }),
  ).toHaveAttribute('aria-sort', 'ascending');
  await expect(main(page).getByText('1–250 of 1,200')).toBeVisible();
  // The table scrolls inside the page; the window doesn't.
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(900);
  expect((await axe(page)).violations).toEqual([]);
});

test('rapid typing shows results for the final query and resets the page', async ({
  page,
}) => {
  await page.goto('/contacts?page=3');
  await page
    .getByRole('searchbox', { name: 'Search contacts' })
    .pressSequentially('ortega', { delay: 40 });
  await expect(page).toHaveURL(/\/contacts\?q=ortega$/);
  await expect(
    page.getByRole('status').filter({ hasText: 'contacts' }),
  ).not.toHaveText('1,200 contacts');
  const names = await table(page).getByRole('link').allTextContents();
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(n.toLowerCase()).toContain('ortega');
});

test('back and forward restore each URL state', async ({ page }) => {
  await page.goto('/contacts');
  await page.getByRole('link', { name: 'Page 2' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(firstDataRow(page)).toHaveAttribute('aria-rowindex', '252');
  // Changing pages focuses the table caption.
  await expect(page.locator('caption')).toBeFocused();

  await page.getByRole('button', { name: 'Name' }).click();
  await expect(page).toHaveURL(/\/contacts\?sort=name$/);
  await expect(firstDataRow(page)).toHaveAttribute('aria-rowindex', '2');

  await page.goBack();
  await expect(page).toHaveURL(/\/contacts\?page=2$/);
  await expect(firstDataRow(page)).toHaveAttribute('aria-rowindex', '252');
  await expect(
    page.getByRole('columnheader', { name: 'Follow-up' }),
  ).toHaveAttribute('aria-sort', 'ascending');

  await page.goForward();
  await expect(page).toHaveURL(/sort=name/);
  await expect(
    page.getByRole('columnheader', { name: 'Name' }),
  ).toHaveAttribute('aria-sort', 'ascending');
});

test('a stale page clamps to the last page and bad values are ignored', async ({
  page,
}) => {
  await page.goto('/contacts?page=999&status=foo');
  await expect(page).toHaveURL(/\/contacts\?page=5$/);
  await expect(page.getByRole('link', { name: 'Page 5' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(main(page).getByText('1,001–1,200 of 1,200')).toBeVisible();
});

test('a quick view filters, shows a chip, and the chip removes it', async ({
  page,
}) => {
  await page.goto('/contacts');
  await page
    .getByRole('navigation', { name: 'Quick views' })
    .getByRole('link', { name: /^Overdue/ })
    .click();
  await expect(page).toHaveURL(/fu=overdue/);
  await settled(page);
  await expect(
    page.getByRole('button', { name: 'Filters, 1 applied' }),
  ).toBeVisible();
  const pills = await table(page)
    .locator('tbody td:nth-child(4)')
    .allTextContents();
  expect(pills.length).toBeGreaterThan(0);
  for (const p of pills) expect(p).toMatch(/^Overdue · \d+d$/);

  await page.getByRole('button', { name: 'Remove Follow-up filter' }).click();
  await expect(page).toHaveURL(/\/contacts$/);
  await expect(page.getByRole('button', { name: 'Filters' })).toBeFocused();
});

test('long names truncate with a tooltip and never widen the table', async ({
  page,
}) => {
  await page.goto('/contacts?q=Featherstonehaugh');
  const link = table(page).getByRole('link');
  await expect(link).toHaveCount(1);
  const name = (await link.textContent())!;
  expect(name).toHaveLength(120);
  await expect(link).toHaveAttribute('title', name);
  const box = await link.evaluate((el) => ({
    clipped: el.scrollWidth > el.clientWidth,
    width: el.getBoundingClientRect().width,
  }));
  expect(box.clipped).toBe(true);
  expect(box.width).toBeLessThanOrEqual(220);
  const scroll = main(page).locator('[data-results-scroll]');
  expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
});

test('no results lists the filters and Clear filters starts over', async ({
  page,
}) => {
  await page.goto('/contacts?q=zzzz&status=closed');
  await expect(
    main(page).getByText('No contacts match these filters.'),
  ).toBeVisible();
  await expect(
    main(page).getByText('Search: “zzzz” · Status: Closed'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL(/\/contacts$/);
  await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(table(page)).toBeVisible();
});

test('keyboard reaches toolbar, headers and rows in order', async ({
  page,
}) => {
  await page.goto('/contacts');
  await page.getByRole('searchbox').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Filters' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /^All/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Name' })).toBeFocused();
  await page.keyboard.press('Tab'); // Status
  await page.keyboard.press('Tab'); // Follow-up
  await page.keyboard.press('Tab'); // Waiting
  await expect(page.getByRole('button', { name: 'Waiting' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    table(page).getByRole('row').nth(1).getByRole('link'),
  ).toBeFocused();
});

test.describe('as a viewer', () => {
  test.use({ storageState: storage.viewer });

  test('a viewer gets the list without New contact', async ({ page }) => {
    await page.goto('/contacts');
    await expect(table(page)).toBeVisible();
    await expect(page.getByRole('link', { name: /New contact/ })).toHaveCount(
      0,
    );
  });
});

test('mobile shows cards and sorts from a menu @mobile', async ({ page }) => {
  await page.goto('/contacts');
  // The menu code loads after hydration; a tap before then does nothing.
  await page.waitForLoadState('networkidle');
  await expect(table(page)).toBeHidden();
  const cards = page.getByRole('list', { name: 'Contacts' });
  await expect(cards).toBeVisible();
  await expect(cards.getByRole('link').first()).toHaveAttribute(
    'href',
    /\/contacts\/c-/,
  );

  await page
    .getByRole('button', {
      name: 'Sort: Follow-up, soonest first',
      expanded: false,
    })
    .click();
  await page.getByRole('menuitemradio', { name: 'Name, A to Z' }).click();
  await expect(page).toHaveURL(/sort=name/);
  await settled(page);
  await expect(
    page.getByRole('button', { name: 'Sort: Name, A to Z' }),
  ).toBeVisible();
  // No sideways scroll at phone width.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  // At the end of the scroll nothing sits under the sticky tab bar; mid-scroll, axe counts the card
  // passing beneath it as an obscured target.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect((await axe(page)).violations).toEqual([]);
});

test('a 100-character search never widens the page at 320px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  const q = 'x'.repeat(100);
  await page.goto(`/contacts?q=${q}`);
  await expect(main(page).getByText(`Search: “${q}”`)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('a slow earlier response never replaces the latest results', async ({
  page,
}) => {
  await page.goto('/contacts');
  await page.waitForLoadState('networkidle');
  // Hold the first search's RSC response back until after the second has landed.
  await page.route(/[?&]q=ortega(&|$)/, async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  const box = page.getByRole('searchbox');
  await box.fill('ortega');
  await page.waitForTimeout(400); // past the 250ms debounce: the ortega request is in flight
  await box.fill('kessler');
  await expect(page).toHaveURL(/q=kessler/);
  await page.waitForTimeout(3000); // the held ortega response has now arrived
  await settled(page);
  await expect(page).toHaveURL(/q=kessler/);
  const names = await table(page).getByRole('link').allTextContents();
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(n.toLowerCase()).toContain('kessler');
});
