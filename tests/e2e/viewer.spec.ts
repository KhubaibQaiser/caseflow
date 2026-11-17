import { expect, test } from '@playwright/test';

import { newContact } from './data';
import { storage } from './helpers';

// The seeded Viewer reads everything and writes nothing.
test.use({ storageState: storage.viewer });

test('Edit and Move are aria-disabled with the reason, and the composer is replaced', async ({
  page,
}) => {
  const c = await newContact();
  await page.goto(`/contacts/${c.id}`);
  const main = page.getByRole('main');
  await page.waitForLoadState('networkidle');

  for (const name of ['Edit', 'Move to…']) {
    const control = main.getByRole('button', { name });
    await expect(control).toHaveAttribute('aria-disabled', 'true');
    await control.focus();
    await expect(page.getByRole('tooltip')).toContainText("Viewers can't");
  }
  await expect(
    main.getByText("Viewers can read notes but can't add them."),
  ).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
});

test('the list has no New contact button', async ({ page }) => {
  await page.goto('/contacts');
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('link', { name: /New contact/ })).toHaveCount(0);
});

test('/contacts/new says the Viewer cannot add contacts', async ({ page }) => {
  await page.goto('/contacts/new');
  await expect(
    page.getByRole('heading', { name: "You can't add contacts." }),
  ).toBeVisible();
});
