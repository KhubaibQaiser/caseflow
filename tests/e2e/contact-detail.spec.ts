import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { format } from 'date-fns';

import type { ContactRow } from '@/lib/contracts/contact';
import { parseDateOnly, todayIn } from '@/lib/dates/date-only';
import { followUpView } from '@/lib/dates/labels';
import { urgencyOf } from '@/lib/dates/urgency';

import { fixtureRows } from './fixture-rows';

// The page reads the fake data layer and a fake viewer until T22. The fixtures are pure and
// dated from "today", so the spec rebuilds the same rows the server renders (the tz cookie is UTC).
const today = todayIn('UTC');
const rows = fixtureRows(today);
const idNumber = (r: ContactRow) => Number(r.id.replace(/\D/g, ''));
// Even ids have two notes, odd ids none (lib/data/fake.ts).
const withNotes = rows.find(
  (r) =>
    idNumber(r) % 2 === 0 && r.status === 'lead' && r.urgency === 'overdue',
)!;
const noNotes = rows.find((r) => idNumber(r) % 2 === 1 && r.email)!;

async function setup(
  context: BrowserContext,
  baseURL: string | undefined,
  role: 'admin' | 'viewer' = 'admin',
) {
  await context.addCookies([
    { name: 'fake-role', value: role, url: baseURL! },
    { name: 'tz', value: 'UTC', url: baseURL! },
  ]);
}

// Axe samples colours as they are drawn, so let pop-in and fade animations finish first.
const settled = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );

const axe = async (page: Page) => {
  await settled(page);
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
};

/**
 * Writes go to Supabase, which T22 wires up. Until then each Server Action POST is answered here:
 * the real reply's framing is kept (it carries the build id) and its payload is swapped for a Result.
 */
async function stubActions(
  page: Page,
  replies: (args: unknown[]) => unknown[],
) {
  const queue = [...[]] as unknown[];
  await page.route('**/contacts/**', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST' || !req.headers()['next-action'])
      return route.continue();
    const args: unknown[] = JSON.parse(req.postData() ?? '[]');
    if (queue.length === 0) queue.push(...replies(args));
    const real = await route.fetch();
    const head = (await real.text()).split('\n')[0];
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/x-component' },
      body: `${head}\n1:${JSON.stringify(queue.shift())}\n`,
    });
  });
}

const rowWith = (r: ContactRow, over: Partial<ContactRow>): ContactRow => {
  const next = { ...r, ...over };
  return { ...next, ...urgencyOf(next.status, next.followUpOn, today) };
};
const note = (body: string) => ({
  id: 'n-new',
  body,
  createdAt: new Date().toISOString(),
  author: { name: 'Alex Morgan', role: 'admin' },
});

test('detail shows the contact, its follow-up, notes and activity', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  await page.goto(`/contacts/${withNotes.id}`);

  await expect(
    page.getByRole('heading', { level: 1, name: withNotes.fullName }),
  ).toBeFocused();
  await expect(page).toHaveTitle(`${withNotes.fullName} · Caseflow`);
  const main = page.getByRole('main');
  await expect(
    main.getByRole('navigation', { name: 'Breadcrumb' }),
  ).toContainText(`Contacts/${withNotes.fullName}`);
  await expect(
    main.getByText(followUpView(withNotes, today).text),
  ).toBeVisible();
  await expect(
    main.getByRole('link', { name: withNotes.email! }),
  ).toHaveAttribute('href', `mailto:${withNotes.email}`);
  await expect(
    main.getByRole('link', { name: withNotes.phone! }),
  ).toHaveAttribute('href', /^tel:\d+$/);
  await expect(main.getByRole('article')).toHaveCount(2);
  const activity = main.getByRole('region', { name: 'Activity' });
  await expect(
    activity.getByText('Alex Morgan created this contact'),
  ).toBeVisible();
  await expect(activity.locator('time').first()).toHaveAttribute(
    'title',
    /\d{4}/,
  );
  await expect(main.getByRole('link', { name: 'Edit' })).toHaveAttribute(
    'href',
    `/contacts/${withNotes.id}/edit`,
  );

  expect((await axe(page)).violations).toEqual([]);
});

test('a contact with no notes says so', async ({ page, context, baseURL }) => {
  await setup(context, baseURL);
  await page.goto(`/contacts/${noNotes.id}`);
  await expect(
    page.getByRole('region', { name: /^Notes/ }).getByText('No notes yet.'),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Add a note' })).toBeVisible();
});

test('adding a note clears the composer, lists it first and announces it', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  await stubActions(page, ([, body]) => [
    { ok: true, data: note(String(body)) },
  ]);
  await page.goto(`/contacts/${withNotes.id}`);

  const box = page.getByRole('textbox', { name: 'Add a note' });
  await expect(page.getByRole('button', { name: 'Save note' })).toBeDisabled();
  await box.fill('Called back, booked a consult.');
  await box.press('ControlOrMeta+Enter');

  await expect(
    page.getByRole('region', { name: /^Notes/ }).getByRole('status'),
  ).toHaveText('Note added.');
  await expect(box).toHaveValue('');
  await expect(box).toBeFocused();
  await expect(page.getByRole('article').first()).toContainText(
    'Called back, booked a consult.',
  );
  await expect(page.getByRole('article')).toHaveCount(3);
});

test('a failed note save keeps the text and Retry saves it', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  await stubActions(page, ([, body]) => [
    {
      ok: false,
      error: { code: 'server', message: 'Something went wrong. Try again.' },
    },
    { ok: true, data: note(String(body)) },
  ]);
  await page.goto(`/contacts/${withNotes.id}`);

  const box = page.getByRole('textbox', { name: 'Add a note' });
  await box.fill('Called back');
  await page.getByRole('button', { name: 'Save note' }).click();

  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'Something went wrong.' });
  await expect(alert).toBeVisible();
  await expect(box).toHaveValue('Called back');
  expect((await axe(page)).violations).toEqual([]);

  await alert.getByRole('button', { name: 'Retry' }).click();
  await expect(box).toHaveValue('');
  await expect(alert).toHaveCount(0);
  await expect(page.getByRole('article').first()).toContainText('Called back');
});

test('reschedule saves the picked day and says so', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  await stubActions(page, ([, day]) => [
    { ok: true, data: rowWith(withNotes, { followUpOn: String(day) }) },
  ]);
  await page.goto(`/contacts/${withNotes.id}`);

  await page.getByRole('button', { name: 'Reschedule' }).click();
  const dialog = page.getByRole('dialog', { name: 'Follow-up date' });
  await expect(dialog).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);

  const todayLabel = format(parseDateOnly(today), 'MMMM d, yyyy');
  await dialog.getByRole('button', { name: new RegExp(todayLabel) }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(/^Follow-up set to /)).toBeVisible();
  await expect(
    page.getByRole('main').getByText('Today', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reschedule' })).toBeFocused();
});

test('move changes the status, the toast names it, and Closed mutes the follow-up', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  await stubActions(page, ([, status]) => [
    {
      ok: true,
      data: rowWith(withNotes, { status: status as ContactRow['status'] }),
    },
  ]);
  await page.goto(`/contacts/${withNotes.id}`);

  const trigger = page.getByRole('button', { name: 'Move to…' });
  await trigger.click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem')).toHaveText(['Active', 'Closed']);
  expect((await axe(page)).violations).toEqual([]);
  await menu.getByRole('menuitem', { name: 'Active' }).click();
  await expect(
    page.getByText(`${withNotes.fullName} moved to Active.`),
  ).toBeVisible();

  // A person waits for the menu to finish closing and the move to settle; so does the test.
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(trigger).not.toHaveAttribute('aria-busy', 'true');
  await trigger.click();
  await expect(page.getByRole('menu').getByRole('menuitem')).toHaveText([
    'Lead',
    'Closed',
  ]);
  await page.getByRole('menuitem', { name: 'Closed' }).click();
  await expect(
    page.getByText("Closed contacts aren't flagged overdue."),
  ).toBeVisible();
  await expect(page.getByText(/^Overdue/)).toHaveCount(0);
});

test('keyboard: Enter opens the move menu on its first item', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  await page.goto(`/contacts/${withNotes.id}`);
  await page.getByRole('button', { name: 'Move to…' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Active' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Move to…' })).toBeFocused();
});

test('a viewer reads everything and every write control says why it is off', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL, 'viewer');
  await page.goto(`/contacts/${withNotes.id}`);
  const main = page.getByRole('main');

  await expect(
    main.getByText("Viewers can read notes but can't add them."),
  ).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(main.getByRole('article')).toHaveCount(2);
  for (const name of ['Move to…', 'Edit', 'Reschedule'])
    await expect(main.getByRole('button', { name })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

  // The tooltip's code loads after hydration; focusing before it lands would hand focus to a remounted button.
  await page.waitForLoadState('networkidle');
  await main.getByRole('button', { name: 'Move to…' }).focus();
  await expect(page.getByRole('tooltip')).toHaveText(
    "Viewers can't edit contacts. Ask an admin.",
  );
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toHaveCount(0);
  expect((await axe(page)).violations).toEqual([]);
});

test('an unknown contact shows the not-found screen with a way back', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  await page.goto('/contacts/no-such-contact');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: "This contact doesn't exist.",
    }),
  ).toBeFocused();
  await expect(
    page.getByRole('link', { name: 'Back to contacts' }),
  ).toHaveAttribute('href', '/contacts');
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    'content',
    /noindex/,
  );
  expect((await axe(page)).violations).toEqual([]);
});

test('@mobile one column with a large Call button', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  await page.goto(`/contacts/${withNotes.id}`);

  const call = page.getByRole('link', { name: `Call ${withNotes.fullName}` });
  await expect(call).toHaveAttribute('href', /^tel:\d+$/);
  expect((await call.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect((await axe(page)).violations).toEqual([]);

  await page.getByRole('button', { name: 'Move to…' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
});
