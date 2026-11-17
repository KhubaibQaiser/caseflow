import { describe, expect, it } from 'vitest';

import { telHref } from './tel-href';

describe('telHref', () => {
  it('keeps digits and a leading +, drops formatting', () => {
    expect(telHref('+1 (415) 555-0132')).toBe('tel:+14155550132');
  });
});
