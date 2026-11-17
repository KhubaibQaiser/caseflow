import { expect, test, type Page } from '@playwright/test';

// Every loading screen must land where its page does: the same boxes, within 1px, and no layout shift.
// The server round trip is held open so the loading.tsx skeleton can be measured, then released.

type Box = { x: number; y: number; w: number; h: number };

/** The page column's visible children (the fixed theme button and sr-only status lines are not layout). */
const measure = (page: Page): Promise<Box[]> =>
  page.evaluate(() => {
    const col = document.querySelector('main#main > :not(.fixed)')!;
    return [...col.children]
      .filter((el) => {
        const cs = getComputedStyle(el);
        return cs.position !== 'absolute' && cs.display !== 'none';
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
  });

/** The skeleton is held on show by /dev/skeleton, so there is no race with the server. */
async function loadingVsLoaded(page: Page, screen: string, to: string) {
  await page.goto(`/dev/skeleton/${screen}`);
  await page.locator('main#main [aria-busy="true"]').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  const loading = await measure(page);
  await page.goto(to);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500); // lists virtualise after hydration
  return { loading, loaded: await measure(page) };
}

const firstContactPath = async (page: Page) => {
  await page.goto('/contacts');
  return (await page
    .locator('a[href^="/contacts/"]:not([href="/contacts/new"]):visible')
    .first()
    .getAttribute('href'))!;
};

for (const size of [
  { name: '1440', width: 1440, height: 900 },
  { name: '375', width: 375, height: 812 },
]) {
  test.describe(`skeletons at ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const [name, screen, to] of [
      ['list', 'list', '/contacts'],
      ['pipeline', 'pipeline', '/pipeline'],
      ['new', 'form', '/contacts/new'],
      ['detail', 'detail', 'DETAIL'],
      ['edit', 'form', 'EDIT'],
    ] as const) {
      test(`${name} loading matches loaded`, async ({ page }) => {
        const detail = await firstContactPath(page);
        const target =
          to === 'DETAIL' ? detail : to === 'EDIT' ? `${detail}/edit` : to;
        const r = await loadingVsLoaded(page, screen, target);
        const fmt = (b?: Box) =>
          b ? [b.x, b.y, b.w, b.h].map((n) => Math.round(n * 10) / 10) : [];
        const vh = size.height;
        const diffs = r.loaded.flatMap((b, i) => {
          const l = r.loading[i];
          if (!l) return [`block ${i}: no skeleton block, loaded ${fmt(b)}`];
          const keys = (['x', 'y', 'w', 'h'] as const).filter(
            (k) => Math.abs(b[k] - l[k]) > 1,
          );
          // Content that runs past the fold (a long form or timeline) only has to fill the screen.
          const tail = i === r.loaded.length - 1 && b.y + b.h > vh;
          const off = tail
            ? keys.filter((k) => k !== 'h').length > 0 || l.y + l.h < vh
            : keys.length > 0;
          return off
            ? [`block ${i}: loading [x,y,w,h] ${fmt(l)} vs loaded ${fmt(b)}`]
            : [];
        });
        expect(r.loading.length, 'same number of blocks').toBe(r.loaded.length);
        expect(diffs).toEqual([]);
      });
    }
  });
}

test.describe('layout shift on a fresh load', () => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 375, height: 812 },
  ]) {
    test.describe(`at ${size.width}`, () => {
      test.use({ viewport: size });
      test(`CLS stays under 0.05`, async ({ page }) => {
        const detail = await firstContactPath(page);
        for (const path of [
          '/contacts',
          '/pipeline',
          '/contacts/new',
          detail,
        ]) {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
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
          expect(cls, path).toBeLessThan(0.05);
        }
      });
    });
  }
});
