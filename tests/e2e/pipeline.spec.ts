import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { inDays, newContact } from './data';
import { settleAnimations, storage } from './helpers';

// Runs signed in as the seeded Admin (global setup) on real data: moves, notes and paging are real round trips.
// A test that moves a card makes its own contact, so other specs' counts and rows are not disturbed.
const axe = async (page: Page) => {
  await settleAnimations(page);
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
};

// Taps before hydration do nothing (the menu and tabs are client code), so wait for the page to settle.
async function board(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

const main = (page: Page) => page.getByRole('main');
const column = (page: Page, status: string) =>
  main(page).getByRole('region', { name: new RegExp(`^${status}`) });
const cards = (page: Page, status: string) =>
  column(page, status)
    .getByRole('list', { name: `${status} contacts` })
    .getByRole('listitem');
const count = async (page: Page, status: string) =>
  Number(
    (await column(page, status).getByRole('heading').innerText()).replace(
      /\D/g,
      '',
    ),
  );

/** Drops the next Server Action POST on the wire, as a lost connection would. */
async function dropNextAction(page: Page) {
  let dropped = false;
  await page.route('**/pipeline**', (route) => {
    const req = route.request();
    if (!dropped && req.method() === 'POST' && req.headers()['next-action']) {
      dropped = true;
      return route.abort('connectionreset');
    }
    return route.continue();
  });
}

test('the board shows three columns, counts and passes axe', async ({
  page,
}) => {
  await board(page, '/pipeline');
  await expect(page).toHaveTitle('Pipeline · Caseflow');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Pipeline' }),
  ).toBeVisible();
  for (const s of ['Lead', 'Active', 'Closed'])
    await expect(column(page, s)).toBeVisible();
  await expect(cards(page, 'Lead')).toHaveCount(50);
  expect(
    (await count(page, 'Lead')) +
      (await count(page, 'Active')) +
      (await count(page, 'Closed')),
  ).toBeGreaterThanOrEqual(2500);
  expect((await axe(page)).violations).toEqual([]);
});

test('Move to… moves the card, updates the counts, toasts and persists', async ({
  page,
}) => {
  // The most overdue lead sorts first in Lead, and stays first once Active.
  const c = await newContact({ status: 'lead', followUpOn: inDays(-60) });
  await board(page, '/pipeline');
  const lead = await count(page, 'Lead');
  const active = await count(page, 'Active');
  const first = column(page, 'Lead').locator(`[data-card="${c.id}"]`);
  await expect(first).toBeVisible();

  await first.getByRole('button', { name: /Move to/ }).click();
  expect((await axe(page)).violations).toEqual([]);
  await page.getByRole('menuitem', { name: 'Active' }).click();

  await expect(page.getByText(`${c.fullName} moved to Active.`)).toBeVisible();
  await expect(
    column(page, 'Lead').locator(`[data-card="${c.id}"]`),
  ).toHaveCount(0);
  await expect(
    column(page, 'Active').locator(`[data-card="${c.id}"]`),
  ).toHaveCount(1);
  expect(await count(page, 'Lead')).toBeLessThan(lead);
  expect(await count(page, 'Active')).toBeGreaterThan(active - 1);

  // It was saved, not just shown.
  await board(page, '/pipeline');
  await expect(
    column(page, 'Active').locator(`[data-card="${c.id}"]`),
  ).toHaveCount(1);
  await expect(
    column(page, 'Lead').locator(`[data-card="${c.id}"]`),
  ).toHaveCount(0);
});

test('a failed move puts the card back and Retry moves it', async ({
  page,
}) => {
  const c = await newContact({ status: 'lead', followUpOn: inDays(-61) });
  await dropNextAction(page);
  await board(page, '/pipeline');
  const card = column(page, 'Lead').locator(`[data-card="${c.id}"]`);
  await card.getByRole('button', { name: /Move to/ }).click();
  await page.getByRole('menuitem', { name: 'Closed' }).click();

  await expect(page.getByText('Move failed. Retry.')).toBeVisible();
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('button', { name: /Move to/ })).toBeFocused();

  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText(`${c.fullName} moved to Closed.`)).toBeVisible();
  await expect(
    column(page, 'Lead').locator(`[data-card="${c.id}"]`),
  ).toHaveCount(0);
});

test('Show 50 more appends the next rows and counts what is left', async ({
  page,
}) => {
  await board(page, '/pipeline');
  const lead = await count(page, 'Lead');
  const more = column(page, 'Lead').getByRole('button', {
    name: /Show 50 more/,
  });
  await expect(more).toHaveText(/^Show 50 more · [\d,]+ left$/);
  expect(lead).toBeGreaterThan(100);
  await more.click();
  await expect(cards(page, 'Lead')).toHaveCount(100);
  await expect(
    column(page, 'Lead').getByRole('button', { name: /Show 50 more/ }),
  ).toHaveText(/^Show 50 more · [\d,]+ left$/);
  // Focus follows the button to the first new card.
  await expect(
    cards(page, 'Lead').nth(50).getByRole('link').first(),
  ).toBeFocused();
  expect((await axe(page)).violations).toEqual([]);
});

test('an empty column says so, and the filters carry over', async ({
  page,
}) => {
  // Closed contacts are never overdue.
  await board(page, '/pipeline?fu=overdue');
  await expect(main(page).getByText('No Closed contacts.')).toBeVisible();
  await expect(
    main(page).getByText("Closed contacts can't be overdue."),
  ).toBeVisible();
  await expect(cards(page, 'Lead').first()).toBeVisible();
  // The columns are the status filter, so the panel has no Status group.
  await page.getByRole('button', { name: /^Filters/ }).click();
  const panel = page.locator('#filters-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Matter type')).toBeVisible();
  await expect(panel.getByText('Status', { exact: true })).toHaveCount(0);
  expect((await axe(page)).violations).toEqual([]);
});

test('a status in the URL is dropped, not shown as a dead chip', async ({
  page,
}) => {
  await board(page, '/pipeline?status=lead&fu=overdue');
  await expect(page).toHaveURL(/\/pipeline\?fu=overdue$/);
});

test.describe('as a viewer', () => {
  test.use({ storageState: storage.viewer });

  test('Move to… is disabled with the reason', async ({ page }) => {
    await board(page, '/pipeline');
    const move = cards(page, 'Lead')
      .first()
      .getByRole('button', { name: /Move to/ });
    await expect(move).toHaveAttribute('aria-disabled', 'true');
    await move.focus();
    await expect(page.getByRole('tooltip')).toHaveText(
      "Viewers can't move contacts.",
    );
    await move.click({ force: true });
    await expect(page.getByRole('menu')).toHaveCount(0);
    expect((await axe(page)).violations).toEqual([]);
  });
});

test('@mobile one column at a time, chosen by tabs with counts', async ({
  page,
}) => {
  await board(page, '/pipeline');
  const tabs = page.getByRole('radiogroup', { name: 'Status' });
  await expect(tabs.getByText('Lead', { exact: false })).toBeVisible();
  await expect(column(page, 'Lead')).toBeVisible();
  await expect(column(page, 'Active')).toBeHidden();
  await tabs.getByText('Active').click();
  await expect(column(page, 'Active')).toBeVisible();
  await expect(column(page, 'Lead')).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  // At the end of the page the sticky tab bar sits below the last card, covering nothing; mid-scroll it
  // overlaps the edge card, which axe reads as an obscured target, so check where nothing is overlapped.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const last = cards(page, 'Active').last();
  await last.scrollIntoViewIfNeeded();
  const [end, bar] = await Promise.all([
    last.boundingBox(),
    page.locator('[data-tab-bar]').boundingBox(),
  ]);
  expect(end!.y + end!.height).toBeLessThanOrEqual(bar!.y);
  expect((await axe(page)).violations).toEqual([]);
  const move = await cards(page, 'Active')
    .first()
    .getByRole('button', { name: /Move to/ })
    .boundingBox();
  expect(move?.height).toBeGreaterThanOrEqual(24);
});

test('@mobile a 120-character name never widens the page, in any column', async ({
  page,
}) => {
  const token = `Wth${Math.random().toString(36).slice(2, 8)}`;
  for (const status of ['lead', 'active', 'closed'] as const)
    await newContact({
      name: token + status[0] + 'w'.repeat(119 - token.length),
      status,
    });
  await board(page, `/pipeline?q=${token}`);
  const tabs = page.getByRole('radiogroup', { name: 'Status' });
  let seen = 0;
  for (const s of ['Lead', 'Active', 'Closed']) {
    await tabs.getByText(s).click();
    await expect(column(page, s)).toBeVisible();
    seen += await cards(page, s).count();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  expect(seen).toBe(3);
});

test('@mobile the Move menu stays clear of the sticky tab bar near the screen foot', async ({
  page,
}) => {
  await board(page, '/pipeline');
  const button = cards(page, 'Lead')
    .nth(4)
    .getByRole('button', { name: /Move to/ });
  // Put the trigger just above the tab bar, where a menu has no room below it.
  await button.evaluate((el) => {
    const bar = document
      .querySelector('[data-tab-bar]')!
      .getBoundingClientRect();
    const r = el.getBoundingClientRect();
    window.scrollBy(0, r.bottom - (bar.top - 8));
  });
  await button.click();
  const menu = await page.getByRole('menu').boundingBox();
  const bar = await page.locator('[data-tab-bar]').boundingBox();
  expect(menu!.y + menu!.height).toBeLessThanOrEqual(bar!.y);
  expect(menu!.y).toBeGreaterThanOrEqual(0);
});

test('Lead sorted by Name A–Z orders the cards, survives a reload and keeps the order on Show 50 more', async ({
  page,
}) => {
  await board(page, '/pipeline');
  const names = (status: string) =>
    cards(page, status).locator('[data-card-link]').allInnerTexts();
  const byName = (list: string[]) =>
    [...list].sort((a, b) => a.localeCompare(b, 'en'));
  const urgent = await names('Lead');
  const activeBefore = await names('Active');
  expect(urgent).not.toEqual(byName(urgent));

  await column(page, 'Lead')
    .getByRole('button', { name: 'Sort Lead: Urgency' })
    .click();
  expect((await axe(page)).violations).toEqual([]);
  await page.getByRole('menuitemradio', { name: 'Name A–Z' }).click();
  await expect(page).toHaveURL(/leadSort=name/);
  const chip = column(page, 'Lead').getByRole('button', {
    name: 'Sort Lead: Name A–Z',
  });
  await expect(chip).toHaveText('Name A–Z');
  await expect(cards(page, 'Lead')).toHaveCount(50);
  const sorted = await names('Lead');
  expect(sorted).toEqual(byName(sorted));
  // Only the Lead column changed.
  expect(await names('Active')).toEqual(activeBefore);
  expect(page.url()).not.toMatch(/activeSort|closedSort/);

  await board(page, page.url());
  await expect(chip).toBeVisible();
  expect(await names('Lead')).toEqual(sorted);

  await column(page, 'Lead')
    .getByRole('button', { name: /Show 50 more/ })
    .click();
  await expect(cards(page, 'Lead')).toHaveCount(100);
  const more = await names('Lead');
  expect(more.slice(0, 50)).toEqual(sorted);
  expect(more).toEqual(byName(more));

  // Back to the default leaves the URL.
  await chip.click();
  await page.getByRole('menuitemradio', { name: /^Urgency/ }).click();
  await expect(page).not.toHaveURL(/leadSort/);
});
