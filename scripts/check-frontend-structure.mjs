// Enforces three front-end rules (AGENTS.md, "Front-end structure"):
//   1. Native Tailwind classes only: no arbitrary values or properties such as text-[11px].
//   2. One React component per file.
//   3. Components hold UI. Logic lives in use-*.ts hooks. Components may keep plain state
//      (useState, useId, useContext, useRef) and call hooks imported from a use-* module.
//
// Existing violations are recorded in scripts/frontend-structure-baseline.json. A file may not
// exceed its recorded count, and a new file with a violation fails. Fixing a violation lets the
// baseline shrink; `node scripts/check-frontend-structure.mjs --write-baseline` records the new counts.
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCAN_DIRS = ['app', 'components', 'features'];
const BASELINE = 'scripts/frontend-structure-baseline.json';
const SIMPLE_HOOKS = new Set(['useState', 'useId', 'useContext', 'useRef']);

/** A class-like token, split on whitespace, quotes, braces and angle brackets. Parentheses and commas stay, because arbitrary values use them. */
const TOKEN_SPLIT = /[\s'"`{};<>]+/;

/** Arbitrary value (`text-[11px]`), or arbitrary property or variant (`[content-visibility:auto]`). */
function isArbitrary(token) {
  if (/-\[[^\]]*\]/.test(token)) return true;
  return /^!?\[[^\]]*:[^\]]*\]/.test(token);
}

/** @param {string} text @returns {string[]} the arbitrary tokens found */
export function findArbitraryClasses(text) {
  return text.split(TOKEN_SPLIT).filter((token) => token && isArbitrary(token));
}

/** Top-level component declarations: PascalCase functions, or PascalCase consts that wrap JSX-returning code. */
const COMPONENT_DECL =
  /^(?:export\s+)?(?:default\s+)?(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*(?::[^=\n]+)?=\s*(?:memo\(|forwardRef\(|\(|function\b))/gm;

/** @param {string} text @returns {string[]} the names of the components declared at the top level */
export function findMultipleComponents(text) {
  const names = [];
  for (const m of text.matchAll(COMPONENT_DECL)) names.push(m[1] ?? m[2]);
  return names;
}

/** Hooks imported from a module whose file name starts with use-. */
function importedUseNames(text) {
  const names = new Set();
  for (const m of text.matchAll(
    /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g,
  )) {
    const fileName = m[2].split('/').pop() ?? '';
    if (!fileName.startsWith('use-')) continue;
    for (const spec of m[1].split(',')) {
      const name = spec
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      if (name) names.add(name);
    }
  }
  return names;
}

/**
 * Hooks a component file calls directly that are not simple state and not imported from a use- module.
 * @param {string} text @returns {string[]}
 */
export function findComponentHookViolations(text) {
  const allowed = importedUseNames(text);
  const found = [];
  for (const m of text.matchAll(/(?<![\w.])(use[A-Z]\w*)\s*\(/g)) {
    const name = m[1];
    if (SIMPLE_HOOKS.has(name) || allowed.has(name)) continue;
    // A hook defined in this file is a declaration, not a call from a component.
    if (new RegExp(`function\\s+${name}\\s*\\(`).test(text)) continue;
    found.push(name);
  }
  return found;
}

/**
 * Compare per-file counts with the baseline.
 * @param {Record<string, number>} current
 * @param {Record<string, number>} baseline
 */
export function compareWithBaseline(current, baseline) {
  const failures = [];
  const shrinkable = [];
  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline[file] ?? 0;
    if (count > allowed)
      failures.push(`${file}: ${count} violations, baseline allows ${allowed}`);
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    if ((current[file] ?? 0) < allowed) shrinkable.push(file);
  }
  return { failures, shrinkable };
}

function* walk(root, dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(root, p);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$|\.d\.ts$/.test(name))
      yield relative(root, p).split('\\').join('/');
  }
}

/** Count violations per rule and file across the scanned folders. */
export function scan(root) {
  const counts = { arbitrary: {}, multipleComponents: {}, componentHooks: {} };
  for (const dir of SCAN_DIRS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const file of walk(root, abs)) {
      const text = readFileSync(join(root, file), 'utf8');
      const arbitrary = findArbitraryClasses(text).length;
      if (arbitrary) counts.arbitrary[file] = arbitrary;
      const components = findMultipleComponents(text);
      if (components.length > 1)
        counts.multipleComponents[file] = components.length - 1;
      if (components.length >= 1) {
        const hooks = findComponentHookViolations(text).length;
        if (hooks) counts.componentHooks[file] = hooks;
      }
    }
  }
  return counts;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const counts = scan(root);
  if (process.argv.includes('--write-baseline')) {
    writeFileSync(join(root, BASELINE), JSON.stringify(counts, null, 2) + '\n');
    console.log(`Baseline written to ${BASELINE}`);
    process.exit(0);
  }
  const baseline = existsSync(join(root, BASELINE))
    ? JSON.parse(readFileSync(join(root, BASELINE), 'utf8'))
    : {};
  const labels = {
    arbitrary: 'Arbitrary Tailwind values (use native classes)',
    multipleComponents:
      'More than one component in a file (one component per file)',
    componentHooks:
      'Logic hooks in a component file (move them to a use-*.ts hook)',
  };
  let failed = false;
  for (const rule of Object.keys(labels)) {
    const { failures, shrinkable } = compareWithBaseline(
      counts[rule],
      baseline[rule] ?? {},
    );
    if (failures.length) {
      failed = true;
      console.error(`${labels[rule]}:\n  ${failures.join('\n  ')}`);
    }
    if (shrinkable.length)
      console.log(
        `Fixed since the baseline, run --write-baseline to lower it: ${shrinkable.join(', ')}`,
      );
  }
  if (failed) process.exit(1);
}
