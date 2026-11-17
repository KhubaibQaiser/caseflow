import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { settleAnimations } from './helpers';

const scrollTo = (page: Page, y: number) =>
  page.evaluate((top) => window.scrollTo(0, top), y);
const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

async function openList(page: Page) {
  await page.goto('/contacts');
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('list', { name: 'Contacts' }).getByRole('link').first(),
  ).toBeVisible();
}

test.describe('mobile scroll behaviour', () => {
  test('@mobile the list header hides on scroll down, the footer stays, scroll up brings it back', async ({
    page,
  }) => {
    await openList(page);
    const header = page.locator('[data-headroom]');
    const count = page.getByRole('button', { name: /rows per page/ });
    await expect(header).not.toHaveAttribute('aria-hidden', 'true');
    await expect(count).toBeInViewport();

    await scrollTo(page, 600);
    await expect(header).toHaveAttribute('aria-hidden', 'true');
    await expect(header).toHaveAttribute('inert', '');
    await expect(count).toBeInViewport();

    await scrollTo(page, 560);
    await expect(header).not.toHaveAttribute('aria-hidden', 'true');
    await expect(header).toBeInViewport();
    await expect(count).toBeInViewport();
  });

  test('@mobile the footer pager changes page without scrolling to the bottom', async ({
    page,
  }) => {
    await openList(page);
    await scrollTo(page, 400);
    const room = await page.evaluate(
      () =>
        document.documentElement.scrollHeight -
        window.innerHeight -
        window.scrollY,
    );
    expect(room).toBeGreaterThan(1000);
    await page.getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText('Page 2 /')).toBeVisible();
    expect(await scrollY(page)).toBeLessThan(50);
  });

  test('@mobile the footer count opens the page-size menu', async ({
    page,
  }) => {
    await openList(page);
    await page.getByRole('button', { name: /rows per page/ }).click();
    await page.getByRole('menuitemradio', { name: '100 per page' }).click();
    await expect(page).toHaveURL(/size=100/);
    await expect(page.getByRole('button', { name: /^1–100 of/ })).toBeVisible();
  });

  test('@mobile on the pipeline the tabs stay while the title hides, and Show 50 more works from the footer', async ({
    page,
  }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');
    const title = page.locator('[data-headroom] > div').first();
    const tabs = page.getByRole('radiogroup', { name: 'Status' });
    await expect(tabs).toBeInViewport();
    await scrollTo(page, 700);
    await expect(title).toHaveAttribute('aria-hidden', 'true');
    await expect(tabs).toBeInViewport({ ratio: 1 });
    // Straight under the top bar (52px), not pushed down by the hidden title.
    await expect
      .poll(async () => (await tabs.boundingBox())!.y, { timeout: 2000 })
      .toBeLessThan(70);

    const cards = page.locator('[data-card]');
    const before = await cards.count();
    const more = page.getByRole('button', { name: /^Show 50 more/ });
    await expect(more).toBeInViewport();
    await more.click();
    await expect.poll(() => cards.count()).toBeGreaterThan(before);
  });

  for (const path of ['/contacts', '/pipeline']) {
    test(`@mobile ${path} has no horizontal scroll at 320, axe is clean and CLS stays low`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await settleAnimations(page);
      const overflow = () =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        );
      expect(await overflow()).toBe(false);
      // Down and back up, so axe reads the hidden header and the shown one.
      for (const y of [0, 700, 500]) {
        await scrollTo(page, y);
        await page.waitForTimeout(350);
        expect(await overflow()).toBe(false);
        // A card half under a stuck bar reads as "obscured" to target-size at any offset; the content scrolls.
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .disableRules(['target-size'])
          .analyze();
        expect(
          violations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical',
          ),
        ).toEqual([]);
      }

      const cls = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            let total = 0;
            new PerformanceObserver((list) => {
              for (const e of list.getEntries() as unknown as {
                value: number;
                hadRecentInput: boolean;
              }[])
                if (!e.hadRecentInput) total += e.value;
            }).observe({ type: 'layout-shift', buffered: true });
            setTimeout(() => resolve(total), 500);
          }),
      );
      expect(cls).toBeLessThan(0.05);
    });
  }
});
