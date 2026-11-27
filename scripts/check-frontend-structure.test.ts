import { describe, expect, it } from 'vitest';
import {
  compareWithBaseline,
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
