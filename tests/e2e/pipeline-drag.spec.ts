import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page, Request } from '@playwright/test';

import { inDays, newContact } from './data';
import { settleAnimations, storage } from './helpers';

// Drag and drop on the pipeline (ADR-0014). Runs as the seeded Admin; each test makes its own contacts and
// filters the board to them with ?q=, so columns hold only this test's cards and the counts are exact.

type Col = 'Lead' | 'Active' | 'Closed';

const main = (page: Page) => page.getByRole('main');
const column = (page: Page, status: Col) =>
  main(page).getByRole('region', { name: new RegExp(`^${status}`) });
const card = (page: Page, id: string) => page.locator(`[data-card="${id}"]`);
const inColumn = (page: Page, status: Col, id: string) =>
  column(page, status).locator(`[data-card="${id}"]`);
const count = async (page: Page, status: Col) =>
  Number(
    (await column(page, status).getByRole('heading').innerText()).replace(
      /\D/g,
      '',
    ),
  );
const copy = (page: Page) => page.locator('[data-drag-copy]');

const token = () => `Drg${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;

// Taps before hydration do nothing (dragging is client code), so wait for the page to settle.
async function board(page: Page, q: string) {
  await page.goto(`/pipeline?q=${q}`);
  await page.waitForLoadState('networkidle');
}

/** Every Server Action this page sends; a drop that changes nothing sends none. */
function actions(page: Page) {
  const sent: Request[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.headers()['next-action']) sent.push(r);
  });
  return sent;
}

/** Presses on the card, moves past the 5px threshold, then to the middle of `to`, and holds there. */
async function pickUp(
  page: Page,
  id: string,
  to: Col | { x: number; y: number },
) {
  const from = await card(page, id).boundingBox();
  if (!from) throw new Error(`card ${id} is not on screen`);
  const end =
    typeof to === 'string' ? await column(page, to).boundingBox() : null;
  const point =
    typeof to === 'string'
      ? { x: end!.x + end!.width / 2, y: end!.y + 80 }
      : to;
  await page.mouse.move(from.x + 20, from.y + 10);
  await page.mouse.down();
  await page.mouse.move(from.x + 30, from.y + 20, { steps: 4 });
  await page.mouse.move(point.x, point.y, { steps: 12 });
}

async function dragCard(page: Page, id: string, to: Col) {
  await pickUp(page, id, to);
  await page.mouse.up();
}

test('a mouse drag moves the card to Active, updates the counts, toasts and persists', async ({
  page,
}) => {
  const q = token();
  const c = await newContact({ name: `${q} Mouse`, followUpOn: inDays(-3) });
  await board(page, q);
  expect(await count(page, 'Lead')).toBe(1);
  expect(await count(page, 'Active')).toBe(0);

  await dragCard(page, c.id, 'Active');

  await expect(page.getByText(`${c.fullName} moved to Active.`)).toBeVisible();
  await expect(inColumn(page, 'Active', c.id)).toHaveCount(1);
  await expect(inColumn(page, 'Lead', c.id)).toHaveCount(0);
  expect(await count(page, 'Lead')).toBe(0);
  expect(await count(page, 'Active')).toBe(1);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(inColumn(page, 'Active', c.id)).toHaveCount(1);
});

test('a click still opens the contact and the Move menu still opens', async ({
  page,
}) => {
  const q = token();
  const c = await newContact({ name: `${q} Click` });
  await board(page, q);
  const it = card(page, c.id);

  await it.getByRole('button', { name: /Move to/ }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);

  await it.getByRole('link', { name: c.fullName }).click();
  await expect(page).toHaveURL(new RegExp(`/contacts/${c.id}$`));
});

test('dropping on its own column or outside the board does nothing', async ({
  page,
}) => {
  const q = token();
  const c = await newContact({ name: `${q} Stay` });
  const sent = actions(page);
  await board(page, q);

  // Over its own column nothing is marked; over another column, that column is.
  await pickUp(page, c.id, 'Lead');
  await expect(card(page, c.id)).toHaveAttribute('data-dragging');
  await expect(column(page, 'Lead')).not.toHaveAttribute('data-drop-target');
  const active = await column(page, 'Active').boundingBox();
  await page.mouse.move(active!.x + active!.width / 2, active!.y + 80, {
    steps: 8,
  });
  await expect(column(page, 'Active')).toHaveAttribute('data-drop-target');
  const lead = await column(page, 'Lead').boundingBox();
  await page.mouse.move(lead!.x + lead!.width / 2, lead!.y + 80, { steps: 8 });
  await page.mouse.up();
  await expect(card(page, c.id)).not.toHaveAttribute('data-dragging');

  // Above the board, on the page heading.
  const heading = await page
    .getByRole('heading', { level: 1, name: 'Pipeline' })
    .boundingBox();
  await pickUp(page, c.id, { x: heading!.x + 10, y: heading!.y + 5 });
  await page.mouse.up();

  await expect(inColumn(page, 'Lead', c.id)).toHaveCount(1);
  expect(await count(page, 'Lead')).toBe(1);
  await expect(page.getByText(/moved to/)).toHaveCount(0);
  await expect(page).toHaveURL(/\/pipeline\?q=/);
  expect(sent).toHaveLength(0);
});

test('two quick drags end in the second column after a reload', async ({
  page,
}) => {
  const q = token();
  const c = await newContact({ name: `${q} Twice` });
  await board(page, q);

  await dragCard(page, c.id, 'Active');
  await expect(inColumn(page, 'Active', c.id)).toHaveCount(1);
  await dragCard(page, c.id, 'Closed');
  await expect(inColumn(page, 'Closed', c.id)).toHaveCount(1);
  await expect(page.getByText(`${c.fullName} moved to Closed.`)).toBeVisible();

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(inColumn(page, 'Closed', c.id)).toHaveCount(1);
  expect(await count(page, 'Lead')).toBe(0);
  expect(await count(page, 'Active')).toBe(0);
  expect(await count(page, 'Closed')).toBe(1);
});

test('a 120-character name stays inside the dragged copy', async ({ page }) => {
  const q = token();
  const c = await newContact({ name: q + 'w'.repeat(120 - q.length) });
  await board(page, q);
  const source = await card(page, c.id).boundingBox();

  await pickUp(page, c.id, 'Active');
  await expect(copy(page)).toBeVisible();
  const lifted = await copy(page).boundingBox();
  expect(lifted!.width).toBeLessThanOrEqual(source!.width + 1);
  await page.mouse.up();
});

test.describe('on a 1024px touch tablet', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });

  /** Real touch input through the DevTools protocol, so Chromium fires touch pointer events and scrolls natively. */
  async function touch(page: Page) {
    const cdp = await page.context().newCDPSession(page);
    const send = (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      x?: number,
      y?: number,
    ) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: x === undefined ? [] : [{ x, y: y! }],
      });
    return {
      start: (x: number, y: number) => send('touchStart', x, y),
      move: (x: number, y: number) => send('touchMove', x, y),
      end: () => send('touchEnd'),
    };
  }

  test('a touch hold drags on a 1024px tablet, and a quick swipe scrolls instead', async ({
    page,
  }) => {
    const q = token();
    const c = await newContact({ name: `${q} Touch` });
    await board(page, q);
    const finger = await touch(page);
    const from = await card(page, c.id).boundingBox();
    const to = await column(page, 'Active').boundingBox();

    // A hold past 250ms picks the card up.
    await finger.start(from!.x + 20, from!.y + 10);
    await page.waitForTimeout(300);
    const steps = 10;
    for (let i = 1; i <= steps; i++)
      await finger.move(
        from!.x + 20 + ((to!.x + to!.width / 2 - from!.x - 20) * i) / steps,
        from!.y + 10 + ((to!.y + 80 - from!.y - 10) * i) / steps,
      );
    await finger.end();
    await expect(inColumn(page, 'Active', c.id)).toHaveCount(1);
    await expect(
      page.getByText(`${c.fullName} moved to Active.`),
    ).toBeVisible();

    // A swipe that moves at once scrolls the full Lead column and moves nothing.
    const sent = actions(page);
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');
    const scroller = column(page, 'Lead').locator('[data-scroller]');
    const box = await scroller.boundingBox();
    const x = box!.x + box!.width / 2;
    await finger.start(x, box!.y + box!.height - 40);
    for (let i = 1; i <= 8; i++)
      await finger.move(x, box!.y + box!.height - 40 - i * 40);
    await finger.end();
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    await expect(page.locator('[data-dragging]')).toHaveCount(0);
    expect(sent).toHaveLength(0);
  });
});

test('after resizing below 768px, cards don’t drag', async ({ page }) => {
  const q = token();
  const c = await newContact({ name: `${q} Narrow` });
  const sent = actions(page);
  await board(page, q);
  await page.setViewportSize({ width: 700, height: 900 });

  const from = await card(page, c.id).boundingBox();
  await page.mouse.move(from!.x + 20, from!.y + 10);
  await page.mouse.down();
  await page.mouse.move(from!.x + 200, from!.y + 200, { steps: 12 });
  await expect(page.locator('[data-dragging]')).toHaveCount(0);
  await expect(copy(page)).toHaveCount(0);
  await page.mouse.up();
  await expect(inColumn(page, 'Lead', c.id)).toHaveCount(1);
  expect(sent).toHaveLength(0);
});

test.describe('as a viewer', () => {
  test.use({ storageState: storage.viewer });

  test('as a viewer, dragging a card does nothing', async ({ page }) => {
    const q = token();
    const c = await newContact({ name: `${q} Viewer` });
    const sent = actions(page);
    await board(page, q);

    await pickUp(page, c.id, 'Active');
    await expect(page.locator('[data-dragging]')).toHaveCount(0);
    await expect(column(page, 'Active')).not.toHaveAttribute(
      'data-drop-target',
    );
    await page.mouse.up();
    await expect(inColumn(page, 'Lead', c.id)).toHaveCount(1);
    expect(sent).toHaveLength(0);
  });
});

test('@mobile holding and moving a card doesn’t move it', async ({ page }) => {
  const q = token();
  const c = await newContact({ name: `${q} Phone` });
  const sent = actions(page);
  await board(page, q);
  const cdp = await page.context().newCDPSession(page);
  const from = await card(page, c.id).boundingBox();
  const x = from!.x + 20;
  const y = from!.y + 10;

  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  await page.waitForTimeout(300);
  for (let i = 1; i <= 8; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + i * 20, y }],
    });
  await expect(page.locator('[data-dragging]')).toHaveCount(0);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(inColumn(page, 'Lead', c.id)).toHaveCount(1);
  expect(sent).toHaveLength(0);
});

// Keyboard drag (T18d): the Drag button after Move to… picks the card up with Space; Left and Right choose a column.

const axe = async (page: Page) => {
  await settleAnimations(page);
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
};

/** Tabs from the card's Move to… onto its Drag button, so the focus is a keyboard focus. */
async function focusDrag(page: Page, id: string, name: string) {
  await card(page, id)
    .getByRole('button', { name: /Move to/ })
    .focus();
  await page.keyboard.press('Tab');
  const drag = page.getByRole('button', { name: `Drag ${name}` });
  await expect(drag).toBeFocused();
  return drag;
}

const said = (page: Page, text: string) =>
  expect(page.getByText(text, { exact: true })).toBeAttached();

test('Space, ArrowRight, Space moves a card to Active by keyboard', async ({
  page,
}) => {
  const q = token();
  const c = await newContact({ name: `${q} Keys` });
  await board(page, q);
  await focusDrag(page, c.id, c.fullName);

  await page.keyboard.press('Space');
  await said(page, `Picked up ${c.fullName} from Lead.`);
  await page.keyboard.press('ArrowRight');
  await said(page, `${c.fullName} is over Active.`);
  await expect(column(page, 'Active')).toHaveAttribute('data-drop-target');
  await page.keyboard.press('Space');

  await expect(inColumn(page, 'Active', c.id)).toHaveCount(1);
  await expect(page.getByText(`${c.fullName} moved to Active.`)).toBeVisible();
  // It was Lead's only card, so the keyboard lands on Lead's heading.
  await expect(page.locator('[data-column="lead"]')).toBeFocused();
});

test('ArrowRight twice reaches Closed, and ArrowDown does nothing', async ({
  page,
}) => {
  const q = token();
  const c = await newContact({ name: `${q} Far` });
  await board(page, q);
  await focusDrag(page, c.id, c.fullName);

  await page.keyboard.press('Space');
  await said(page, `Picked up ${c.fullName} from Lead.`);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-drop-target]')).toHaveCount(0);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await said(page, `${c.fullName} is over Closed.`);
  await page.keyboard.press('Space');
  await expect(inColumn(page, 'Closed', c.id)).toHaveCount(1);
});

test('Escape and Tab cancel a keyboard drag', async ({ page }) => {
  const q = token();
  const c = await newContact({ name: `${q} Cancel` });
  const sent = actions(page);
  await board(page, q);

  for (const key of ['Escape', 'Tab']) {
    await focusDrag(page, c.id, c.fullName);
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await said(page, `${c.fullName} is over Active.`);
    await page.keyboard.press(key);
    await said(page, `${c.fullName} was not moved.`);
    await expect(page.locator('[data-dragging]')).toHaveCount(0);
    await expect(inColumn(page, 'Lead', c.id)).toHaveCount(1);
  }
  expect(sent).toHaveLength(0);
});

test('the Drag button shows only on focus, and Viewers have none', async ({
  page,
  browser,
}) => {
  const q = token();
  const c = await newContact({ name: `${q} Shown` });
  await board(page, q);
  const drag = page.getByRole('button', { name: `Drag ${c.fullName}` });
  await expect(drag).toBeAttached();
  await expect(drag).toHaveCSS('opacity', '0');
  await focusDrag(page, c.id, c.fullName);
  await expect(drag).toHaveCSS('opacity', '1');

  const viewer = await browser.newPage({ storageState: storage.viewer });
  await board(viewer, q);
  await expect(card(viewer, c.id)).toBeVisible();
  await expect(viewer.getByRole('button', { name: /^Drag / })).toHaveCount(0);
  await viewer.close();
});

test('@mobile phones have no Drag button', async ({ page }) => {
  const q = token();
  const c = await newContact({ name: `${q} Pocket` });
  await board(page, q);
  await expect(card(page, c.id)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Drag / })).toHaveCount(0);
});

test('axe passes while a card is picked up', async ({ page }) => {
  const q = token();
  const c = await newContact({ name: `${q} Axe` });
  await board(page, q);
  await focusDrag(page, c.id, c.fullName);
  await page.keyboard.press('Space');
  await said(page, `Picked up ${c.fullName} from Lead.`);
  expect((await axe(page)).violations).toEqual([]);
  await page.keyboard.press('Escape');
});
