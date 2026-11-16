import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('an unknown URL returns 404 and names the path', async ({ page }) => {
  const response = await page.goto('/no-such-page/at-all');

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Page not found.' }),
  ).toBeFocused();
  await expect(page.getByText('/no-such-page/at-all')).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Go to contacts' }),
  ).toHaveAttribute('href', '/contacts');
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Pipeline' }),
  ).toHaveAttribute('href', '/pipeline');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(axe.violations).toEqual([]);
});
