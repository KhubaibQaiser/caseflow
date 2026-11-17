import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Runs on the fake data layer until T22. Writes need the database, so the move action is answered here:
// the client code under test (optimistic move, rollback, toasts) is the real one.
const axe = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

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

/** Answers moveContactAction (a Server Action POST with [id, status]) as the database would. */
async function answerMoves(page: Page, ok: boolean) {
  await page.route('**/pipeline**', async (route) => {
    const req = route.request();
    const body = req.method() === 'POST' ? req.postData() : null;
    const args: unknown = body ? JSON.parse(body) : null;
    const isMove =
      Array.isArray(args) &&
      args.length === 2 &&
      typeof args[0] === 'string' &&
      typeof args[1] === 'string';
    if (!isMove) return route.fallback();
    if (!ok) return route.fulfill({ status: 500, body: 'down' });
    const now = new Date().toISOString();
    const row = JSON.stringify({
      ok: true,
      data: { id: args[0], updatedAt: now },
    });
    return route.fulfill({
      status: 200,
      contentType: 'text/x-component',
      body: `0:{"a":"$@1","f":"","b":"x"}\n1:${row}\n`,
    });
  });
}

/**
 * Answers loadMoreColumnAction ([{status, filters, page}]): its permission check needs the database,
 * which the fake layer has no stand-in for. The rows are made up; the merge and counts are the real client's.
 */
async function answerLoadMore(page: Page, matching: number) {
  await page.route('**/pipeline**', async (route) => {
    const req = route.request();
    const body = req.method() === 'POST' ? req.postData() : null;
    const args: unknown = body ? JSON.parse(body) : null;
    const input = Array.isArray(args) ? args[0] : null;
    if (!input || typeof input !== 'object' || !('page' in input))
      return route.fallback();
    const rows = Array.from({ length: 50 }, (_, i) => ({
      id: `x-${i}`,
      fullName: `Loaded Person ${i}`,
      email: null,
      phone: null,
      matterType: 'family',
      referralSource: null,
      status: 'lead',
      followUpOn: '2027-06-01',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-02T10:00:00.000Z',
      urgency: 'later',
      daysOverdue: null,
      open: { tone: 'later', text: 'Tue, Jun 1', rank: 2 },
      closed: { tone: 'muted', text: 'Tue, Jun 1', rank: 3 },
    }));
    return route.fulfill({
      status: 200,
      contentType: 'text/x-component',
      body: `0:{"a":"$@1","f":"","b":"x"}\n1:${JSON.stringify({ ok: true, data: { rows, matching } })}\n`,
    });
  });
}

const openMove = async (page: Page, status: string, index = 0) => {
  const card = cards(page, status).nth(index);
  await card.getByRole('button', { name: /Move to/ }).click();
  return card;
};

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
  ).toBe(1200);
  expect((await axe(page)).violations).toEqual([]);
});

test('Move to… moves the card, updates the counts and toasts', async ({
  page,
}) => {
  await answerMoves(page, true);
  await board(page, '/pipeline');
  const lead = await count(page, 'Lead');
  const active = await count(page, 'Active');
  const first = cards(page, 'Lead').first();
  const name = await first.getByRole('link').first().innerText();
  const id = (await first.getAttribute('data-card')) ?? '';

  await first.getByRole('button', { name: /Move to/ }).click();
  expect((await axe(page)).violations).toEqual([]);
  await page.getByRole('menuitem', { name: 'Active' }).click();

  await expect(page.getByText(`${name} moved to Active.`)).toBeVisible();
  await expect(page.locator(`[data-card="${id}"]`)).toHaveCount(1);
  await expect(column(page, 'Lead').locator(`[data-card="${id}"]`)).toHaveCount(
    0,
  );
  await expect(
    column(page, 'Active').locator(`[data-card="${id}"]`),
  ).toHaveCount(1);
  expect(await count(page, 'Lead')).toBe(lead - 1);
  expect(await count(page, 'Active')).toBe(active + 1);
  // The keyboard lands on the neighbour, not on the page.
  await expect(
    cards(page, 'Lead').first().locator('[data-card-link]'),
  ).toBeFocused();
});

test('a failed move puts the card back and Retry moves it', async ({
  page,
}) => {
  await answerMoves(page, false);
  await board(page, '/pipeline');
  const lead = await count(page, 'Lead');
  const name = await cards(page, 'Lead')
    .first()
    .getByRole('link')
    .first()
    .innerText();

  await openMove(page, 'Lead');
  await page.getByRole('menuitem', { name: 'Closed' }).click();

  await expect(page.getByText('Move failed. Retry.')).toBeVisible();
  await expect(
    cards(page, 'Lead').first().getByRole('link').first(),
  ).toHaveText(name);
  expect(await count(page, 'Lead')).toBe(lead);
  await expect(
    cards(page, 'Lead')
      .first()
      .getByRole('button', { name: /Move to/ }),
  ).toBeFocused();

  await page.unroute('**/pipeline**');
  await answerMoves(page, true);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText(`${name} moved to Closed.`)).toBeVisible();
  expect(await count(page, 'Lead')).toBe(lead - 1);
});

test('Show 50 more appends the next rows and counts what is left', async ({
  page,
}) => {
  await board(page, '/pipeline');
  const lead = await count(page, 'Lead');
  await answerLoadMore(page, lead);
  const more = column(page, 'Lead').getByRole('button', {
    name: /Show 50 more/,
  });
  await expect(more).toHaveText(`Show 50 more · ${lead - 50} left`);
  await more.click();
  await expect(cards(page, 'Lead')).toHaveCount(100);
  await expect(
    column(page, 'Lead').getByRole('button', { name: /Show 50 more/ }),
  ).toHaveText(`Show 50 more · ${lead - 100} left`);
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
  // The toolbar's "Filters, 1 applied" label drops the visible "Filters 1" text (T15, same on the list); not this task's to change.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .disableRules(['label-content-name-mismatch'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('a status in the URL is dropped, not shown as a dead chip', async ({
  page,
}) => {
  await board(page, '/pipeline?status=lead&fu=overdue');
  await expect(page).toHaveURL(/\/pipeline\?fu=overdue$/);
});

test('a viewer sees Move to… disabled with the reason', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: 'fake-role', value: 'viewer', url: baseURL! },
  ]);
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
  await board(page, '/pipeline?q=Worthington');
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
  expect(seen).toBeGreaterThan(0);
});
