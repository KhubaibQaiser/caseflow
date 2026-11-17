import { describe, expect, it } from 'vitest';
import { formatPhoneLite } from './format-phone';

describe('formatPhoneLite', () => {
  it('shows +1 numbers in national format', () => {
    expect(formatPhoneLite('+15125550148')).toBe('(512) 555-0148');
  });
  it('leaves everything else as stored', () => {
    expect(formatPhoneLite('+447911123456')).toBe('+447911123456');
    expect(formatPhoneLite('(512) 555-0148')).toBe('(512) 555-0148');
    expect(formatPhoneLite('ext 5')).toBe('ext 5');
  });
});
