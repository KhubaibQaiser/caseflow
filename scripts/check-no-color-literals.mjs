// Fails on hex / rgb( / hsl( colour literals outside app/globals.css (spec 8.13).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['app', 'components', 'features', 'lib', 'utils'];
const EXEMPT = join('app', 'globals.css');
const PATTERN = /#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx|css)$/.test(name)) yield p;
  }
}

const hits = [];
for (const root of ROOTS.filter(existsSync)) {
  for (const file of walk(root)) {
    if (file === EXEMPT) continue;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (PATTERN.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
      });
  }
}
if (hits.length) {
  console.error(
    'Colour literals found (use design tokens):\n' + hits.join('\n'),
  );
  process.exit(1);
}
