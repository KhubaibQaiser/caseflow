import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { newContact } from './data';
import { settleAnimations, storage } from './helpers';

// axe finds no serious or critical issue on any screen, signed in as each role. (The per-screen specs
// already assert zero violations in their own states; this is the one place that walks every screen.)
for (const role of ['admin', 'viewer'] as const) {
  test.describe(`as ${role}`, () => {
    test.use({ storageState: storage[role] });

    test('every screen passes axe', async ({ page }) => {
      const c = await newContact();
      const screens = [
        '/contacts',
        `/contacts/${c.id}`,
        '/contacts/new',
        `/contacts/${c.id}/edit`,
        '/pipeline',
      ];
      for (const url of screens) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        await settleAnimations(page);
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const bad = violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        expect(bad, url).toEqual([]);
      }
    });
  });
}

test.describe('signed out', () => {
  test.use({ storageState: storage.signedOut });

  test('/login passes axe', async ({ page }) => {
    await page.goto('/login');
    await settleAnimations(page);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      ),
    ).toEqual([]);
  });
});
