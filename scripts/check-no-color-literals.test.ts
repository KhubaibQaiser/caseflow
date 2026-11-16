import { describe, expect, it } from 'vitest';
import { findColorLiterals } from './check-no-color-literals.mjs';

describe('findColorLiterals', () => {
  it('flags colour functions and hex values', () => {
    expect(findColorLiterals('a { color: rgba(0, 0, 0, 0.5); }')).toHaveLength(
      1,
    );
    expect(
      findColorLiterals("style={{ color: 'oklch(0.5 0.1 200)' }}"),
    ).toHaveLength(1);
    expect(findColorLiterals("const c = '#fff';")).toHaveLength(1);
    expect(findColorLiterals('// tint #fff here')).toHaveLength(1);
  });

  it('ignores anchors and issue refs in comments', () => {
    expect(findColorLiterals('<a href="#add">Add</a>')).toEqual([]);
    expect(findColorLiterals("<Link to='#main' />")).toEqual([]);
    expect(findColorLiterals('// see #123 for context')).toEqual([]);
    expect(findColorLiterals('const background = token;')).toEqual([]);
  });

  it('reports line numbers', () => {
    expect(findColorLiterals('ok\nconst c = "#abcdef";')).toEqual([
      { line: 2, text: 'const c = "#abcdef";' },
    ]);
  });
});
