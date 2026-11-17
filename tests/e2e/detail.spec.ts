import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { format } from 'date-fns';

import { parseDateOnly } from '@/lib/dates/date-only';

import { inDays, newContact, today } from './data';
import { storage } from './helpers';

// Real data: each test makes its own contact (tests/e2e/data.ts) and every save is a real round trip.
const NOTES = ['Left a voicemail.', 'Sent the intake questionnaire.'];
const seeded = (over: Parameters<typeof newContact>[0] = {}) =>
  newContact({
    status: 'lead',
    followUpOn: inDays(-3),
    notes: NOTES,
    ...over,
  });

// The tz cookie keeps "today" equal to the seed's (UTC).
async function setup(context: BrowserContext, baseURL: string | undefined) {
  await context.addCookies([{ name: 'tz', value: 'UTC', url: baseURL! }]);
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

const axe = async (page: Page, within?: string) => {
  await settled(page);
  const builder = new AxeBuilder({ page });
  if (within) builder.include(within);
  return builder
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
};

test('detail shows the contact, its follow-up, notes and activity', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  const withNotes = await seeded();
  await page.goto(`/contacts/${withNotes.id}`);

  await expect(
    page.getByRole('heading', { level: 1, name: withNotes.fullName }),
  ).toBeFocused();
  await expect(page).toHaveTitle(`${withNotes.fullName} · Caseflow`);
  const main = page.getByRole('main');
  await expect(
    main.getByRole('navigation', { name: 'Breadcrumb' }),
  ).toContainText(`Contacts/${withNotes.fullName}`);
  await expect(main.getByText('Overdue · 3d')).toBeVisible();
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
  const noNotes = await newContact();
  await page.goto(`/contacts/${noNotes.id}`);
  await expect(
    page.getByRole('region', { name: /^Notes/ }).getByText('No notes yet.'),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Add a note' })).toBeVisible();
});

test('notes take bold, lists and links, and render them safely', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  const withNotes = await seeded();
  await page.goto(`/contacts/${withNotes.id}`);

  // Typed at human speed: ProseMirror applies a mark toggle between keystrokes.
  const box = page.getByRole('textbox', { name: 'Add a note' });
  const bar = page.getByRole('toolbar', { name: 'Formatting' });
  await box.click();
  await page.keyboard.press('ControlOrMeta+B');
  await expect(bar.getByRole('button', { name: 'Bold' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.type('Documents', { delay: 20 });
  await page.keyboard.press('ControlOrMeta+B');
  await page.keyboard.type(' needed:', { delay: 20 });
  await page.keyboard.press('Enter');
  await bar.getByRole('button', { name: 'Bulleted list' }).click();
  await page.keyboard.type('police report', { delay: 20 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('photos of both cars', { delay: 20 });

  // Link: triple-click the second item to select it, then add an address through the form (Ctrl or Cmd+K).
  await box.locator('li').last().click({ clickCount: 3 });
  await page.keyboard.press('ControlOrMeta+K');
  const address = page.getByRole('textbox', { name: 'Link address' });
  await expect(address).toBeFocused();
  await address.fill('javascript:alert(1)');
  await address.press('Enter');
  await expect(
    page.getByText('Use an http, https or mailto link.'),
  ).toBeVisible();
  expect((await axe(page)).violations).toEqual([]); // toolbar, link form and editor
  await address.fill('example.com/photos');
  await address.press('Enter');
  await expect(box.locator('a')).toHaveAttribute(
    'href',
    'https://example.com/photos',
  );

  await box.press('ControlOrMeta+Enter');
  const first = page.getByRole('article').first();
  await expect(first.locator('strong')).toHaveText('Documents');
  await expect(first.locator('ul > li')).toHaveCount(2);
  const link = first.getByRole('link', { name: 'photos of both cars' });
  await expect(link).toHaveAttribute('href', 'https://example.com/photos');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  expect((await axe(page)).violations).toEqual([]); // the rendered rich note
});

test('pasting markup keeps only what a note may carry', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  const withNotes = await seeded();
  await page.goto(`/contacts/${withNotes.id}`);

  const box = page.getByRole('textbox', { name: 'Add a note' });
  await box.click();
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData(
      'text/html',
      '<h1>Title</h1><p onclick="alert(1)">Hello <u>there</u> <a href="javascript:alert(1)">bad</a> <img src=x onerror=alert(1)> <code>c</code></p>',
    );
    data.setData('text/plain', 'Title Hello there bad c');
    document.activeElement?.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(box).toContainText('Hello');
  await expect(box.locator('h1, u, code, img, script')).toHaveCount(0);
  await expect(box.locator('a[href^="javascript"]')).toHaveCount(0);
  await expect(box.locator('[onclick]')).toHaveCount(0);
});

test('adding a note clears the composer, lists it first and announces it', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  const withNotes = await seeded();
  await page.goto(`/contacts/${withNotes.id}`);

  const box = page.getByRole('textbox', { name: 'Add a note' });
  await expect(page.getByRole('button', { name: 'Save note' })).toBeDisabled();
  await box.fill('Called back, booked a consult.');
  await box.press('ControlOrMeta+Enter');

  await expect(
    page.getByRole('region', { name: /^Notes/ }).getByRole('status'),
  ).toHaveText('Note added.');
  await expect(box).toHaveText('');
  await expect(box).toBeFocused();
  await expect(page.getByRole('article').first()).toContainText(
    'Called back, booked a consult.',
  );
  await expect(page.getByRole('article')).toHaveCount(3);
  // The same note leads the Activity timeline, then survives a reload (it was really saved).
  const activity = page.getByRole('region', { name: 'Activity' });
  await expect(
    activity.getByText('Alex Morgan added a note').first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(3);
  await expect(
    page
      .getByRole('region', { name: 'Activity' })
      .getByRole('listitem')
      .first(),
  ).toContainText('Alex Morgan added a note');
});

test('a failed note save keeps the text, rings the frame, and Save note sends it again', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  const withNotes = await seeded();
  await page.goto(`/contacts/${withNotes.id}`);
  // The connection drops on the first save; the second goes through to the database.
  let dropped = false;
  await page.route('**/contacts/**', async (route) => {
    const req = route.request();
    if (!dropped && req.method() === 'POST' && req.headers()['next-action']) {
      dropped = true;
      return route.abort('connectionreset');
    }
    return route.continue();
  });

  const box = page.getByRole('textbox', { name: 'Add a note' });
  await box.fill('Called back');
  await page.getByRole('button', { name: 'Save note' }).click();

  const alert = page.getByRole('alert').filter({
    hasText: 'Note not saved. Check your connection and save again.',
  });
  await expect(alert).toBeVisible();
  await expect(box).toHaveText('Called back');
  await expect(box).toHaveAttribute('aria-invalid', 'true');
  // One button: the separate Retry is gone, and the error sits below the frame.
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
  const frame = box.locator('xpath=ancestor::*[@data-note-composer]');
  expect((await alert.boundingBox())!.y).toBeGreaterThan(
    (await frame.boundingBox())!.y + (await frame.boundingBox())!.height - 1,
  );
  expect((await axe(page)).violations).toEqual([]);

  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(box).toHaveText('');
  await expect(alert).toHaveCount(0);
  await expect(page.getByRole('article').first()).toContainText('Called back');
});

test('reschedule saves the picked day and says so', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  const withNotes = await seeded();
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
  // Saved for real: a reload still shows today, not the old overdue date.
  await page.reload();
  await expect(
    page.getByRole('main').getByText('Today', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/^Overdue/)).toHaveCount(0);
});

test('move changes the status, the toast names it, and Closed mutes the follow-up', async ({
  page,
  context,
  baseURL,
}) => {
  await setup(context, baseURL);
  const withNotes = await seeded();
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
  const withNotes = await seeded();
  await page.goto(`/contacts/${withNotes.id}`);
  // Enter before hydration would press an inert button.
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Move to…' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Active' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Move to…' })).toBeFocused();
});

test.describe('as a viewer', () => {
  test.use({ storageState: storage.viewer });

  test('@mobile a viewer title row has no New contact', async ({
    page,
    context,
    baseURL,
  }) => {
    await setup(context, baseURL);
    await page.goto('/contacts');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Contacts' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /New/ })).toHaveCount(0);
  });

  test('a viewer reads everything and every write control says why it is off', async ({
    page,
    context,
    baseURL,
  }) => {
    await setup(context, baseURL);
    const withNotes = await seeded();
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
});

test.describe('mobile list header', () => {
  test('@mobile New contact keeps its width and the count drops at 320px', async ({
    page,
    context,
    baseURL,
  }) => {
    await setup(context, baseURL);
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/contacts');
    await expect(page.getByRole('link', { name: 'New contact' })).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Contacts' }),
    ).toBeVisible();
    await expect(page.getByText(/ of /).first()).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
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
  const withNotes = await seeded();
  await page.goto(`/contacts/${withNotes.id}`);

  const call = page.getByRole('link', { name: `Call ${withNotes.fullName}` });
  await expect(call).toHaveAttribute('href', /^tel:\d+$/);
  expect((await call.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // The top bar is the mark only; the way back is a 32px "Contacts" link above the name.
  await expect(
    page.getByRole('link', { name: 'New', exact: true }),
  ).toHaveCount(0);
  const back = page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Contacts' });
  await expect(back).toHaveAttribute('href', '/contacts');
  const [b, h] = [
    (await back.boundingBox())!,
    (await page.getByRole('heading', { level: 1 }).boundingBox())!,
  ];
  expect(b.height).toBeGreaterThanOrEqual(32);
  expect(b.y + b.height).toBeLessThanOrEqual(h.y + 2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  // Scroll the composer clear of the fixed tab bar, as a person would to use it.
  await page
    .getByRole('toolbar', { name: 'Formatting' })
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  expect((await axe(page)).violations).toEqual([]);

  await page.getByRole('button', { name: 'Move to…' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  // The page scrolled back to the top, where the tab bar covers the composer: audit the menu itself.
  expect((await axe(page, '[role="menu"]')).violations).toEqual([]);
});

// A segment's loading.tsx wraps every route under it. The list's skeleton must not stand in for
// the pages beside it: it lives in app/(app)/contacts/(list), so /contacts/new and /contacts/[id]
// get their own (or none). A prefetched link shows the boundary at once, which is how this shows.
test.describe('loading boundaries', () => {
  const slowRsc = (page: Page, pattern: string) =>
    page.route(pattern, async (route) => {
      const h = route.request().headers();
      if (h['rsc'] && !h['next-router-prefetch'])
        await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });

  // Next's router is on window in the browser; the app has no typed handle on it.
  type Router = { prefetch(h: string): Promise<void>; push(h: string): void };
  const router = (page: Page, call: 'prefetch' | 'push', href: string) =>
    page.evaluate(
      ([c, h]) =>
        (window as unknown as { next: { router: Router } }).next.router[
          c as 'prefetch' | 'push'
        ](h as string),
      [call, href],
    );

  test('a prefetched New contact page never shows the list skeleton', async ({
    page,
    context,
    baseURL,
  }) => {
    await setup(context, baseURL);
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    await router(page, 'prefetch', '/contacts/new');
    await page.waitForTimeout(1000);
    await slowRsc(page, '**/contacts/new*');

    await router(page, 'push', '/contacts/new');
    await page.waitForTimeout(1000); // inside the delay
    // A one-shot count: a retrying assertion would pass as soon as the delayed page replaced the skeleton.
    expect(await page.getByText('Loading contacts').count()).toBe(0);
    // and it shows the form's own skeleton
    await expect(
      page.getByRole('status', { name: 'Loading contact' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'New contact' }),
    ).toBeVisible();
  });

  test('a prefetched contact shows the contact skeleton, not the list one', async ({
    page,
    context,
    baseURL,
  }) => {
    await setup(context, baseURL);
    const withNotes = await seeded();
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    const href = `/contacts/${withNotes.id}`;
    await router(page, 'prefetch', href);
    await page.waitForTimeout(1000);
    await slowRsc(page, `**${href}*`);
    await router(page, 'push', href);

    await expect(
      page.getByText('Loading contact', { exact: true }),
    ).toBeVisible();
    expect(await page.getByText('Loading contacts').count()).toBe(0);
  });
});
