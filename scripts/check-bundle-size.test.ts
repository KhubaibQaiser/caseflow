import { describe, expect, it } from 'vitest';

import { firstLoadFiles, overBudget } from './check-bundle-size.mjs';

describe('firstLoadFiles', () => {
  it('unions root files with every entry, once each, skipping global-error', () => {
    const files = firstLoadFiles({
      rootFiles: ['a.js', 'b.js'],
      entryJSFiles: {
        '[project]/app/layout': ['a.js', 'c.js'],
        '[project]/app/page': ['c.js', 'd.js', 'x.css'],
        '[project]/app/global-error': ['only-on-crash.js'],
      },
    });
    expect(files.sort()).toEqual(['a.js', 'b.js', 'c.js', 'd.js']);
  });
});

describe('overBudget', () => {
  it('lists routes above the limit only', () => {
    expect(
      overBudget({ '/contacts': 181_000, '/pipeline': 90_000 }, 180_000),
    ).toEqual(['/contacts']);
    expect(overBudget({ '/': 180_000 }, 180_000)).toEqual([]);
  });

  it('ignores /dev routes, which 404 in production', () => {
    expect(
      overBudget(
        { '/dev/components': 999_999, '/(app)/dev/forbidden': 999_999 },
        180_000,
      ),
    ).toEqual([]);
  });
});
