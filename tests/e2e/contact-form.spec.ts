import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { editBehindBack, newContact } from './data';
import { settleAnimations, storage } from './helpers';

const axe = async (page: import('@playwright/test').Page) => {
  await settleAnimations(page);
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
};

test('an empty submit lists every error and focuses the summary', async ({
  page,
}) => {
  await page.goto('/contacts/new');
  expect((await axe(page)).violations).toEqual([]);

  await page.getByRole('button', { name: 'Save contact' }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'need attention' });
  await expect(summary).toContainText('3 fields need attention.');
  await expect(summary).toBeFocused();

  await summary.getByRole('link', { name: /Email or phone/ }).click();
  await expect(page.locator('#contactMethod')).toBeFocused();
  expect((await axe(page)).violations).toEqual([]);
});

test('fill and save lands on the new contact with the toast', async ({
  page,
}) => {
  const name = `E2E Created ${Math.random().toString(36).slice(2, 8)}`;
  await page.goto('/contacts/new');
  await page.waitForLoadState('networkidle');
  await page.getByRole('textbox', { name: /Full name/ }).fill(name);
  await page
    .getByRole('textbox', { name: 'Email', exact: true })
    .fill('new.client@example.test');
  await page
    .getByRole('combobox', { name: /Matter type/ })
    .selectOption('Family');
  await page.getByRole('button', { name: 'Save contact' }).click();

  await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page.getByText('Contact saved')).toBeVisible();
});

test('edit saves, lands on the detail page with the toast, and does not false-conflict', async ({
  page,
}) => {
  const c = await newContact();
  await page.goto(`/contacts/${c.id}/edit`);
  await page.waitForLoadState('networkidle');
  const name = page.getByRole('textbox', { name: /Full name/ });
  await expect(name).toHaveValue(c.fullName);
  await name.fill(`${c.fullName} Jr`);
  await page.getByRole('button', { name: 'Save contact' }).click();

  await expect(page).toHaveURL(new RegExp(`/contacts/${c.id}$`));
  await expect(
    page.getByRole('heading', { level: 1, name: `${c.fullName} Jr` }),
  ).toBeVisible();
  await expect(page.getByText('Contact saved')).toBeVisible();

  // The page the save landed on carries a fresh stamp: a second edit saves without a conflict.
  await page.goto(`/contacts/${c.id}/edit`);
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('textbox', { name: /Full name/ })
    .fill(`${c.fullName} III`);
  await page.getByRole('button', { name: 'Save contact' }).click();
  await expect(page).toHaveURL(new RegExp(`/contacts/${c.id}$`));
});

test('a change made behind the open form shows the conflict banner', async ({
  page,
}) => {
  const c = await newContact();
  await page.goto(`/contacts/${c.id}/edit`);
  await page.waitForLoadState('networkidle');
  await editBehindBack(c.id, `${c.fullName} (renamed)`);

  await page
    .getByRole('textbox', { name: /Full name/ })
    .fill(`${c.fullName} mine`);
  await page.getByRole('button', { name: 'Save contact' }).click();
  const banner = page
    .getByRole('alert')
    .filter({ hasText: 'This contact was changed since you opened it.' });
  await expect(banner).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/contacts/${c.id}/edit$`));
  expect((await axe(page)).violations).toEqual([]);

  await banner.getByRole('button', { name: 'Reload latest' }).click();
  await expect(page.getByRole('textbox', { name: /Full name/ })).toHaveValue(
    `${c.fullName} (renamed)`,
  );
});

test('an unknown contact id shows the not-found screen', async ({ page }) => {
  await page.goto('/contacts/no-such-id/edit');
  // loading.tsx has already sent a 200, so assert the screen, not the status.
  await expect(
    page.getByRole('heading', { name: "This contact doesn't exist." }),
  ).toBeVisible();
});

test.describe('as a viewer', () => {
  test.use({ storageState: storage.viewer });

  test('gets the forbidden screen on both form routes', async ({ page }) => {
    await page.goto('/contacts/new');
    await expect(
      page.getByRole('heading', { name: "You can't add contacts." }),
    ).toBeVisible();
    await page.goto('/contacts/anything/edit');
    await expect(
      page.getByRole('heading', { name: "You can't edit contacts." }),
    ).toBeVisible();
    expect((await axe(page)).violations).toEqual([]);
  });
});

test('a dirty form asks before the sidebar leaves it', async ({ page }) => {
  await page.goto('/contacts/new');
  await page.getByRole('textbox', { name: /Full name/ }).fill('Ana Díaz');
  await page.getByRole('link', { name: 'Pipeline' }).click();
  const dialog = page.getByRole('dialog', { name: 'Discard changes?' });
  await expect(dialog).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);

  await dialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(/\/contacts\/new$/);
  await expect(page.getByRole('textbox', { name: /Full name/ })).toHaveValue(
    'Ana Díaz',
  );
  await page.getByRole('link', { name: 'Pipeline' }).click();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page).toHaveURL(/\/pipeline$/);
});
