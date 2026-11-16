// Fails when any route's first-load JS exceeds the budget (spec 8.12), gzipped.
// Next 16 prints no sizes, so sum the chunks each route's client-reference manifest lists.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const LIMIT_BYTES = 180_000;

/** @param {{ rootFiles: string[], entryJSFiles: Record<string, string[]> }} input */
export function firstLoadFiles({ rootFiles, entryJSFiles }) {
  const files = new Set(rootFiles);
  for (const [entry, list] of Object.entries(entryJSFiles)) {
    if (entry.endsWith('/global-error')) continue; // only loads when the root layout crashes
    for (const f of list) if (f.endsWith('.js')) files.add(f);
  }
  return [...files];
}

/** @param {Record<string, number>} sizes @param {number} limit */
export const overBudget = (sizes, limit) =>
  Object.entries(sizes)
    // /dev/* is dev-only (404 in production), so it carries no budget.
    .filter(
      ([route, bytes]) => bytes > limit && !/^(\/\(app\))?\/dev\//.test(route),
    )
    .map(([route]) => route);

function* manifests(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* manifests(p);
    else if (e.name === 'page_client-reference-manifest.js') yield p;
  }
}

function main(root = '.next') {
  const build = JSON.parse(
    readFileSync(join(root, 'build-manifest.json'), 'utf8'),
  );
  // polyfillFiles are nomodule: modern browsers never fetch them.
  const rootFiles = build.rootMainFiles;
  const gz = new Map();
  const size = (f) => {
    if (!gz.has(f)) gz.set(f, gzipSync(readFileSync(join(root, f))).length);
    return gz.get(f);
  };

  const sizes = {};
  for (const file of manifests(join(root, 'server', 'app'))) {
    globalThis.__RSC_MANIFEST = {};
    new Function(readFileSync(file, 'utf8'))();
    for (const [key, m] of Object.entries(globalThis.__RSC_MANIFEST)) {
      const route = key.replace(/\/page$/, '') || '/';
      const files = firstLoadFiles({ rootFiles, entryJSFiles: m.entryJSFiles });
      sizes[route] = files.reduce((sum, f) => sum + size(f), 0);
    }
  }

  for (const [route, bytes] of Object.entries(sizes).sort())
    console.log(`${(bytes / 1000).toFixed(1).padStart(7)} kB  ${route}`);
  const bad = overBudget(sizes, LIMIT_BYTES);
  if (bad.length) {
    console.error(
      `\nOver ${LIMIT_BYTES / 1000} kB gzipped first-load JS: ${bad.join(', ')}`,
    );
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
