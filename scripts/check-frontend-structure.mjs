// Enforces three front-end rules (AGENTS.md, "Front-end structure"):
//   1. Native Tailwind classes only: no arbitrary values or properties such as text-[11px].
//   2. One React component per file.
//   3. Components hold UI. Logic lives in use-*.ts hooks. Components may keep plain state
//      (useState, useId, useContext, useRef) and call hooks imported from a use-* module. A file of
//      40 non-blank lines or fewer may call up to two other hooks itself.
// Arbitrary variants such as data-[state=open]: pass. The utility after them is still checked.
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
// A component this small may call a couple of logic hooks itself (Khubaib, 2026-11-27, DECISIONS row 36).
const SMALL_COMPONENT_LINES = 40;
const SMALL_COMPONENT_HOOKS = 2;

/**
 * A class-like token: runs of non-separator characters, where a bracket group stays whole, so
 * `[&>svg]:text-[11px]` is one token even though `>` separates JSX tags. Parentheses and commas stay,
 * because arbitrary values use them. Matches the global khubaib-react-practices guard.
 */
const CLASS_TOKEN = /(?:\[[^\]\s'"`]*\]|[^\s'"`{};<>[])+/g;

/** A hook call: useX(...), React.useX(...) or useX<T>(...). A `function useX(` declaration is not a call. */
const HOOK_CALL =
  /(?<![\w.$])(?<!function\s+)(?:React\.)?(use[A-Z]\w*)\s*(?:<[^>()\n]*>)?\s*\(/g;

/**
 * Blank out comments with spaces, so offsets and line numbers still match. Quotes are tracked so `//`
 * and `/*` inside strings stay. A ' or " string ends at the line break, so an apostrophe in JSX text
 * can't swallow the rest of the file.
 * @param {string} text @returns {string}
 */
function stripComments(text) {
  let out = '';
  let quote = null;
  for (let i = 0; i < text.length;) {
    const c = text[i];
    const next = text[i + 1];
    if (quote) {
      if (c === '\\') {
        out += text.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (c === quote || (c === '\n' && quote !== '`')) quote = null;
      out += c;
      i += 1;
    } else if (c === '/' && (next === '/' || next === '*')) {
      const close =
        next === '/' ? text.indexOf('\n', i) : text.indexOf('*/', i + 2);
      const stop =
        close === -1 ? text.length : next === '/' ? close : close + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else {
      if (c === '"' || c === "'" || c === '`') quote = c;
      out += c;
      i += 1;
    }
  }
  return out;
}

/** The utility part of a class: what follows the last variant colon outside brackets. */
function utilityOf(token) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i += 1) {
    if (token[i] === '[') depth += 1;
    else if (token[i] === ']') depth -= 1;
    else if (token[i] === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start);
}

/**
 * Arbitrary value (`text-[11px]`) or arbitrary property (`[content-visibility:auto]`) in the utility.
 * Arbitrary variants such as `data-[state=open]:` pass, because Radix and ARIA states often have no
 * built-in variant.
 */
function isArbitrary(token) {
  const utility = utilityOf(token);
  if (/-\[[^\]]+\]/.test(utility)) return true;
  return /^!?\[[^\]]*:[^\]]*\]/.test(utility);
}

/** @param {string} text @returns {string[]} the arbitrary tokens found */
export function findArbitraryClasses(text) {
  return (stripComments(text).match(CLASS_TOKEN) ?? []).filter(isArbitrary);
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

/** Local names of hooks imported from a module whose file name starts with use-: named, aliased or default. */
function importedUseNames(text) {
  const names = new Set();
  for (const m of text.matchAll(
    /import\s+(?:type\s+)?([^'"]*?)\s+from\s+['"]([^'"]+)['"]/g,
  )) {
    const fileName = m[2].split('/').pop() ?? '';
    if (!fileName.startsWith('use-')) continue;
    const clause = m[1];
    const named = clause.match(/\{([^}]*)\}/);
    const defaultName = clause
      .replace(/\{[^}]*\}/, '')
      .replace(/,/g, ' ')
      .trim();
    if (/^[A-Za-z_$][\w$]*$/.test(defaultName)) names.add(defaultName);
    for (const spec of named ? named[1].split(',') : []) {
      const local = spec
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (local) names.add(local);
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
  for (const m of stripComments(text).matchAll(HOOK_CALL)) {
    const name = m[1];
    if (SIMPLE_HOOKS.has(name) || allowed.has(name)) continue;
    found.push(name);
  }
  return found;
}

/**
 * Logic hooks that count against a component file. A file of 40 non-blank lines or fewer with at most
 * two of them counts none. A file without a component counts none.
 * @param {string} text @returns {number}
 */
export function componentHookCount(text) {
  if (findMultipleComponents(text).length === 0) return 0;
  const hooks = findComponentHookViolations(text).length;
  const lines = text.split('\n').filter((line) => line.trim() !== '').length;
  return lines <= SMALL_COMPONENT_LINES && hooks <= SMALL_COMPONENT_HOOKS
    ? 0
    : hooks;
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
      const hooks = componentHookCount(text);
      if (hooks) counts.componentHooks[file] = hooks;
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
