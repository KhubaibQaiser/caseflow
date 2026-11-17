import { expect, test } from '@playwright/test';

// Runs in the `mobile` project (iPhone 13 viewport) because of the tag.
test('@mobile the tab bar, the cards and the Filters sheet', async ({
  page,
}) => {
  await page.goto('/contacts');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-tab-bar]')).toBeVisible();
  const cards = page.getByRole('list', { name: 'Contacts' });
  await expect(cards.getByRole('link').first()).toBeVisible();

  const button = page.getByRole('button', { name: 'Filters' });
  await button.click();
  const sheet = page.getByRole('dialog', { name: /^Filters/ });
  await expect(sheet).toBeVisible();

  // Focus stays inside the sheet however far Tab goes.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(
      await sheet.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(button).toBeFocused();
});

test('@mobile one sort button beside the tabs sorts the visible column', async ({
  page,
}) => {
  await page.goto('/pipeline');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Lead sorted by Urgency')).toBeVisible();
  await page.getByRole('button', { name: 'Sort Lead: Urgency' }).click();
  await page.getByRole('menuitemradio', { name: 'Name A–Z' }).click();
  await expect(page).toHaveURL(/leadSort=name/);
  await expect(page.getByText('Lead sorted by Name A–Z')).toBeVisible();
  await page.getByRole('radio', { name: /Active/ }).click({ force: true });
  await expect(page.getByText('Active sorted by Urgency')).toBeVisible();
});
