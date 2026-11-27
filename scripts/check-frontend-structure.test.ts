import { describe, expect, it } from 'vitest';
import {
  compareWithBaseline,
  componentHookCount,
  findArbitraryClasses,
  findComponentHookViolations,
  findMultipleComponents,
} from './check-frontend-structure.mjs';

describe('findArbitraryClasses', () => {
  it('flags arbitrary values and arbitrary properties', () => {
    expect(
      findArbitraryClasses('<p className="text-[11px] font-bold" />'),
    ).toEqual(['text-[11px]']);
    expect(findArbitraryClasses("cn('md:h-[190.6px]', 'x')")).toEqual([
      'md:h-[190.6px]',
    ]);
    expect(findArbitraryClasses('"[content-visibility:auto] p-2"')).toEqual([
      '[content-visibility:auto]',
    ]);
    expect(findArbitraryClasses('"grid-cols-[minmax(0,1fr)_auto]"')).toEqual([
      'grid-cols-[minmax(0,1fr)_auto]',
    ]);
  });

  it('ignores native classes, tokens and brackets in plain text', () => {
    expect(
      findArbitraryClasses(
        '"grid gap-3 text-13 bg-surface rounded-surface gap-y-0.75"',
      ),
    ).toEqual([]);
    expect(
      findArbitraryClasses(
        'throw new Error("Contact card [index] is missing")',
      ),
    ).toEqual([]);
    expect(findArbitraryClasses('const first = items[0];')).toEqual([]);
  });
});

describe('arbitrary variants', () => {
  it('passes arbitrary variants and still checks the utility after them', () => {
    expect(
      findArbitraryClasses(
        '"data-[state=open]:border-accent aria-[current=page]:text-accent has-[[aria-invalid=true]]:border-overdue min-[400px]:p-2"',
      ),
    ).toEqual([]);
    expect(
      findArbitraryClasses(
        '"forced-colors:text-[HighlightText] data-[state=open]:w-[1px] max-md:[transform:none]"',
      ),
    ).toEqual([
      'forced-colors:text-[HighlightText]',
      'data-[state=open]:w-[1px]',
      'max-md:[transform:none]',
    ]);
  });
});

describe('findMultipleComponents', () => {
  it('flags a file with two components', () => {
    const src =
      'export function Card() { return <li />; }\nfunction Row() { return <tr />; }\n';
    expect(findMultipleComponents(src)).toEqual(['Card', 'Row']);
  });

  it('allows one component with lower-case helpers and types', () => {
    const src =
      'type Props = { a: number };\nexport function Card(p: Props) { return <li>{helper(p.a)}</li>; }\nfunction helper(n: number) { return n; }\n';
    expect(findMultipleComponents(src)).toEqual(['Card']);
  });

  it('counts a memoized component as a component', () => {
    const src =
      'export const A = memo(function A() { return null; });\nexport const B = memo(function B() { return null; });\n';
    expect(findMultipleComponents(src)).toEqual(['A', 'B']);
  });
});

describe('findComponentHookViolations', () => {
  it('flags effects and callbacks written in a component file', () => {
    const src =
      "import { useEffect } from 'react';\nexport function Card() { useEffect(() => {}); return null; }\n";
    expect(findComponentHookViolations(src)).toEqual(['useEffect']);
  });

  it('allows plain state and a hook imported from a use- module', () => {
    const src = [
      "import { useState } from 'react';",
      "import { useContactCards } from './use-contact-cards';",
      'export function Card() {',
      '  const [open, setOpen] = useState(false);',
      '  const cards = useContactCards();',
      '  return null;',
      '}',
    ].join('\n');
    expect(findComponentHookViolations(src)).toEqual([]);
  });

  it('flags a hook that is not from a use- module', () => {
    const src =
      "import { useThing } from './things';\nexport function Card() { useThing(); return null; }\n";
    expect(findComponentHookViolations(src)).toEqual(['useThing']);
  });
});

/** A component file with `hooks` logic hook calls, padded to `lines` non-blank lines. */
function component(hooks: number, lines: number) {
  const head = [
    "import { usePathname, useRouter, useSearchParams } from 'next/navigation';",
    'export function Nav() {',
  ];
  const calls = [
    '  const router = useRouter();',
    '  const path = usePathname();',
    '  const query = useSearchParams();',
  ].slice(0, hooks);
  const tail = ['  return <nav />;', '}'];
  const pad = Array.from(
    { length: lines - head.length - calls.length - tail.length },
    (_, i) => `  // line ${i}`,
  );
  return [...head, ...calls, ...pad, ...tail, ''].join('\n');
}

describe('componentHookCount', () => {
  it('lets a component of 40 non-blank lines or fewer call up to two logic hooks', () => {
    expect(componentHookCount(component(2, 40))).toBe(0);
    expect(componentHookCount(component(2, 40).replace(/\n/g, '\n\n'))).toBe(0);
  });

  it('counts every hook once the file has a third hook or a 41st line', () => {
    expect(componentHookCount(component(3, 40))).toBe(3);
    expect(componentHookCount(component(1, 41))).toBe(1);
  });

  it('counts nothing in a file without a component', () => {
    expect(
      componentHookCount('export function useNav() { useEffect(() => {}); }\n'),
    ).toBe(0);
  });
});

describe('compareWithBaseline', () => {
  it('fails when a file has more violations than its baseline, or is new', () => {
    const baseline = { 'a.tsx': 2 };
    expect(compareWithBaseline({ 'a.tsx': 3 }, baseline).failures).toHaveLength(
      1,
    );
    expect(compareWithBaseline({ 'b.tsx': 1 }, baseline).failures).toHaveLength(
      1,
    );
  });

  it('passes at or below the baseline and reports when the baseline can shrink', () => {
    const result = compareWithBaseline({ 'a.tsx': 1 }, { 'a.tsx': 2 });
    expect(result.failures).toEqual([]);
    expect(result.shrinkable).toEqual(['a.tsx']);
  });
});
