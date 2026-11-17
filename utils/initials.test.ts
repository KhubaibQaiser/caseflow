import { describe, expect, it } from 'vitest';

import { initials } from './initials';

describe('initials', () => {
  it('takes the first letter of the first and last word', () => {
    expect(initials('Khubaib Qaiser')).toBe('KQ');
    expect(initials('mary jane watson')).toBe('MW');
  });
  it('gives one letter for a single word', () => {
    expect(initials('Sam')).toBe('S');
  });
  it('ignores extra whitespace and handles empty', () => {
    expect(initials('  Sam   Patel ')).toBe('SP');
    expect(initials('   ')).toBe('');
  });
});
