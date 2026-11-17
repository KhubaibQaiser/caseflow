import { describe, expect, it } from 'vitest';
import { formatPhone } from './phone';

describe('formatPhone', () => {
  it('uses national format for US and CA', () => {
    expect(formatPhone('+15125550148')).toBe('(512) 555-0148');
    expect(formatPhone('+14165550123')).toBe('(416) 555-0123');
  });
  it('uses international format for the rest', () => {
    expect(formatPhone('+447911123456')).toBe('+44 7911 123456');
  });
  it('returns unparseable text as is', () => {
    expect(formatPhone('ext 5')).toBe('ext 5');
    expect(formatPhone('+1 555')).toBe('+1 555');
  });
});
