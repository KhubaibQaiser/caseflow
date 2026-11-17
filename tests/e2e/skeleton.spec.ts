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
          // On a phone the meta line wraps by contact (1 or 2 rows), so below the breadcrumb only x and w are fixed.
          const fixed =
            name === 'detail' && size.width < 768 && i > 0
              ? (['x', 'w'] as const)
              : (['x', 'y', 'w', 'h'] as const);
          const keys = fixed.filter((k) => Math.abs(b[k] - l[k]) > 1);
          // Content that runs past the fold (a long form or timeline) only has to fill the screen.
          // A contact's notes and activity set the last block's height, so it only has to start in place and fill the screen.
          const tail =
            i === r.loaded.length - 1 && (b.y + b.h > vh || name === 'detail');
          const off = tail
            ? keys.filter((k) => k !== 'h').length > 0 ||
              (b.y + b.h > vh && l.y + l.h < vh)
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

/** x, y, w, h of every element a selector matches, rounded to a tenth. */
const boxes = (page: Page, selector: string): Promise<number[][]> =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll(sel)].map((el) => {
        const r = el.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height].map(
          (n) => Math.round(n * 10) / 10,
        );
      }),
    selector,
  );

/** `skip` drops one of x, y, w, h (0-3) from the comparison. */
function near(a: number[][], b: number[][], skip = -1) {
  expect(a.length, 'same number of boxes').toBe(b.length);
  a.forEach((box, i) =>
    box.forEach((n, k) => {
      if (k === skip) return;
      expect(
        Math.abs(n - (b[i]?.[k] ?? Infinity)),
        `box ${i} [x,y,w,h][${k}]`,
      ).toBeLessThanOrEqual(1);
    }),
  );
}

// The skeleton's boxes sit inside the page boxes, so a shift inside a block (not just between blocks) shows up here.
for (const size of [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
]) {
  test.describe(`inside the skeletons at ${size.width}`, () => {
    test.use({ viewport: size });

    test('new contact: every control block lines up', async ({ page }) => {
      // Controls are the 34px+ blocks; labels and hints are shorter. The phone's number input shares its row with the country button.
      const controls = (loaded: boolean) =>
        loaded
          ? 'main#main form :is(input:not([type=tel]):not(.sr-only), select, textarea, button, [role=radiogroup])'
          : 'main#main [aria-busy] span[aria-hidden]';
      await page.goto('/dev/skeleton/form');
      await page.locator('main#main [aria-busy="true"]').first().waitFor();
      const skeleton = (await boxes(page, controls(false))).filter(
        (b) => (b[3] ?? 0) >= 34,
      );
      await page.goto('/contacts/new');
      await page.waitForLoadState('networkidle');
      const loaded = (await boxes(page, controls(true))).filter(
        (b) => (b[3] ?? 0) >= 34,
      );
      // The phone row is one block over a country button and an input, so its width is the one thing that cannot match.
      near(skeleton, loaded, 2);
    });

    test('contacts: skeleton rows are the loaded rows', async ({ page }) => {
      const wide = size.width >= 768;
      const head = 'main#main table thead th';
      const row = wide
        ? 'main#main table tbody tr:first-child td'
        : 'main#main ul > li:first-child';
      await page.goto('/dev/skeleton/list');
      await page.locator('main#main [aria-busy="true"]').first().waitFor();
      const loading = await boxes(page, wide ? `${head}, ${row}` : row);
      await page.goto('/contacts');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const loaded = await boxes(page, wide ? `${head}, ${row}` : row);
      expect(loading.length, 'skeleton cells found').toBeGreaterThan(0);
      near(loading, loaded);
    });
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
