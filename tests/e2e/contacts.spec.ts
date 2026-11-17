import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { newContact } from './data';
import { settleAnimations, storage } from './helpers';

// Seeded data: 2,500 contacts. Specs that create a contact (this one, the form, detail) share the database, so a total
// reads "2,5nn" rather than exactly 2,500.
const TOTAL = '2,5\\d\\d';
const axe = async (page: Page) => {
  await settleAnimations(page);
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
};

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
  await expect(
    main(page).getByText(new RegExp(`^${TOTAL} of ${TOTAL}$`)),
  ).toBeVisible();
  await expect(table(page)).toHaveAttribute('aria-rowcount', /^25\d\d$/);
  await expect(firstDataRow(page)).toHaveAttribute('aria-rowindex', '2');
  await expect(
    page.getByRole('columnheader', { name: 'Follow-up' }),
  ).toHaveAttribute('aria-sort', 'ascending');
  await expect(
    main(page).getByText(new RegExp(`^1–250 of ${TOTAL}$`)),
  ).toBeVisible();
  // The table scrolls inside the page; the window doesn't.
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(900);
  expect((await axe(page)).violations).toEqual([]);
});

test('search finds a contact by the digits of a phone number', async ({
  page,
}) => {
  await page.goto('/contacts?q=5550148');
  await settled(page);
  const count = await table(page).getByRole('link').count();
  expect(count).toBeGreaterThan(0);
  await expect(main(page).getByText(new RegExp(`of ${TOTAL}$`))).toBeVisible();
});

test('a Status filter applies, shows a chip and the count, and survives a reload', async ({
  page,
}) => {
  await page.goto('/contacts');
  await page.waitForLoadState('networkidle');
  const button = page.getByRole('button', { name: /^Filters/ });
  await button.click();
  const panel = page.getByRole('complementary', { name: 'Filters' });
  await panel.getByRole('checkbox', { name: /^Closed / }).check();
  await panel.getByRole('button', { name: 'Apply' }).click();
  await expect(panel).toBeHidden();
  await expect(page).toHaveURL(/status=closed/);
  await settled(page);
  const chips = page.getByRole('list', { name: 'Applied filters' });
  await expect(chips).toContainText('Closed');
  const summary = main(page).getByText(new RegExp(`^[\\d,]+ of ${TOTAL}$`));
  await expect(summary).not.toHaveText(new RegExp(`^${TOTAL} of`));
  const shown = await summary.textContent();

  await page.reload();
  await expect(chips).toContainText('Closed');
  await expect(main(page).getByText(shown!)).toBeVisible();
});

test('sorting by Name toggles aria-sort', async ({ page }) => {
  await page.goto('/contacts');
  const head = page.getByRole('columnheader', { name: 'Name' });
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Name' }).click();
  await expect(head).toHaveAttribute('aria-sort', 'ascending');
  await page.getByRole('button', { name: 'Name' }).click();
  await expect(head).toHaveAttribute('aria-sort', 'descending');
});

test('page size 50 shows 50 rows, and a filter change goes back to page 1', async ({
  page,
}) => {
  await page.goto('/contacts');
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('combobox', { name: 'Rows per page' })
    .selectOption('50');
  await expect(page).toHaveURL(/size=50/);
  await settled(page);
  await expect(
    main(page).getByText(new RegExp(`^1–50 of ${TOTAL}$`)),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Page 2' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    main(page).getByText(new RegExp(`^51–100 of ${TOTAL}$`)),
  ).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Quick views' })
    .getByRole('link', { name: /^Overdue/ })
    .click();
  await expect(page).toHaveURL(/fu=overdue/);
  await expect(page).not.toHaveURL(/page=/);
});

test('rapid typing shows results for the final query and resets the page', async ({
  page,
}) => {
  await page.goto('/contacts?page=3');
  await page
    .getByRole('searchbox', { name: 'Search contacts' })
    .pressSequentially('ahme', { delay: 40 });
  await expect(page).toHaveURL(/\/contacts\?q=ahme$/);
  await settled(page);
  const names = await table(page).getByRole('link').allTextContents();
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(n.toLowerCase()).toContain('ahme');
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
  await expect(page).toHaveURL(/\/contacts\?page=1[01]$/);
  await expect(
    page
      .getByRole('navigation', { name: 'Pagination' })
      .locator('[aria-current="page"]'),
  ).toHaveText(/^1[01]$/);
  await expect(
    main(page).getByText(new RegExp(`^2,\\d{3}–${TOTAL} of ${TOTAL}$`)),
  ).toBeVisible();
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
    page.getByRole('button', { name: 'Filters 1 applied' }),
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
  const token = `Fth${Math.random().toString(36).slice(2, 8)}`;
  await newContact({ name: token + 'x'.repeat(120 - token.length) });
  await page.goto(`/contacts?q=${token}`);
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

test('the filters panel applies once, resets the page, remembers it is open and passes axe', async ({
  page,
}) => {
  await page.goto('/contacts?page=2');
  const button = page.getByRole('button', { name: /^Filters/ });
  await page.waitForLoadState('networkidle');
  await button.click();
  const panel = page.getByRole('complementary', { name: 'Filters' });
  await expect(panel).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(panel.getByRole('checkbox', { name: /^Lead / })).toBeVisible();
  // Docked flush to the window's right and bottom edges, as in the comp.
  const box = (await panel.boundingBox())!;
  expect(Math.round(box.x + box.width)).toBe(1440);
  expect(Math.round(box.y + box.height)).toBe(900);
  expect((await axe(page)).violations).toEqual([]);

  // Nothing reaches the URL until Apply.
  await panel.getByRole('checkbox', { name: /^Lead / }).check();
  await panel.getByRole('checkbox', { name: /^Active / }).check();
  await expect(page).toHaveURL(/page=2/);
  await panel.getByRole('button', { name: 'Apply' }).dblclick();
  await expect(page).toHaveURL(/\/contacts\?status=lead,active$/);
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();
  await settled(page);
  const pills = await table(page)
    .locator('tbody td:nth-child(3)')
    .allTextContents();
  expect(pills.length).toBeGreaterThan(0);
  for (const p of pills) expect(p).not.toMatch(/Closed/);

  // Left open, it is open on the next load (cookie); Esc discards and returns to the button.
  await button.click();
  await page.reload();
  await expect(panel).toBeVisible();
  await panel.getByRole('checkbox', { name: /^Closed / }).check();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();
  await expect(page).toHaveURL(/status=lead,active$/);
});

test('applied filters keep every accessible name matching its visible text (axe)', async ({
  page,
}) => {
  await page.goto('/contacts?status=lead,active&fu=overdue');
  await expect(
    page.getByRole('button', { name: 'Filters 2 applied' }),
  ).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
});

test('the filters sheet opens on a phone, traps focus and applies @mobile', async ({
  page,
}) => {
  await page.goto('/contacts');
  await page.waitForLoadState('networkidle');
  const button = page.getByRole('button', { name: 'Filters' });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.click();
  const sheet = page.getByRole('dialog', { name: /^Filters/ });
  await expect(sheet).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);

  await sheet.getByRole('checkbox', { name: /^Closed / }).check();
  await sheet.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/status=closed/);
  await expect(sheet).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Filters 1 applied' }),
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
    /\/contacts\/[0-9a-f-]{36}$/,
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
  const q = 'q'.repeat(100);
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
  await page.route(/[?&]q=ahmed(&|$)/, async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  const box = page.getByRole('searchbox');
  await box.fill('ahmed');
  await page.waitForTimeout(400); // past the 250ms debounce: the ahmed request is in flight
  await box.fill('okafor');
  await expect(page).toHaveURL(/q=okafor/);
  await page.waitForTimeout(3000); // the held ahmed response has now arrived
  await settled(page);
  await expect(page).toHaveURL(/q=okafor/);
  const names = await table(page).getByRole('link').allTextContents();
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(n.toLowerCase()).toContain('okafor');
});
