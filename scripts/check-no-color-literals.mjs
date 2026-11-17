// Fails on colour literals (hex, rgb(), oklch() …) outside app/globals.css (spec 8.13).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const IGNORE = [
  'node_modules',
  '.next',
  '.git',
  '.worktrees',
  '.superpowers',
  '.vercel',
  'out',
  'build',
  'design',
  'docs',
  'coverage',
  'playwright-report',
  'test-results',
  'app/globals.css',
  // These two spell out colour literals on purpose.
  'scripts/check-no-color-literals.mjs',
  'scripts/check-no-color-literals.test.ts',
  'lib/theme-colors.ts', // viewport.themeColor literals; lib/theme.test.ts ties them to --canvas
];
const PATTERN =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)\(/g;

/** @param {string} text @returns {{ line: number, text: string }[]} */
export function findColorLiterals(text) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    const flagged = [...line.matchAll(PATTERN)].some((m) => {
      if (!m[0].startsWith('#')) return true;
      const before = line.slice(0, m.index);
      if (/(?:href|to)=\{?["'`]$/.test(before)) return false; // anchor link
      if (/^#\d+$/.test(m[0]) && /\/\/|\/\*|^\s*\*/.test(before)) return false; // issue ref
      return true;
    });
    if (flagged) hits.push({ line: i + 1, text: line.trim() });
  });
  return hits;
}

function* walk(root, dir = root) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(root, p).split('\\').join('/');
    if (IGNORE.includes(rel)) continue;
    if (statSync(p).isDirectory()) yield* walk(root, p);
    else if (/\.(ts|tsx|css|mjs)$/.test(name)) yield rel;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const hits = [];
  for (const file of walk(root))
    for (const h of findColorLiterals(readFileSync(join(root, file), 'utf8')))
      hits.push(`${file}:${h.line}: ${h.text}`);
  if (hits.length) {
    console.error(
      'Colour literals found (use design tokens):\n' + hits.join('\n'),
    );
    process.exit(1);
  }
}
