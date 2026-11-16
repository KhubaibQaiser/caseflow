import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('drops falsy parts', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('lets a later border colour win over the shared one', () => {
    expect(cn('border border-transparent px-2', 'border-lead-border')).toBe(
      'border px-2 border-lead-border',
    );
  });

  it('keeps the 13px size token next to a colour token', () => {
    expect(cn('text-13 text-ink-2')).toBe('text-13 text-ink-2');
    expect(cn('text-13', 'text-xs')).toBe('text-xs');
  });

  it('merges radius tokens', () => {
    expect(cn('rounded-ctl', 'rounded-pill')).toBe('rounded-pill');
  });
});
