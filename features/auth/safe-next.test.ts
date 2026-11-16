import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it.each(['/contacts', '/contacts?q=a&b=1', '/contacts/abc#x', '/'])(
    'keeps same-origin path %s',
    (p) => expect(safeNext(p)).toBe(p),
  );

  it.each([
    '//evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    'https://x',
    'javascript:alert(1)',
    'contacts',
    '',
    '/\t/evil.com',
    '/\n/evil.com',
    ' //evil.com',
    '/a\\b',
  ])('rejects %j', (p) => expect(safeNext(p)).toBeNull());

  it('rejects non-strings', () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(new File([], 'x'))).toBeNull();
  });
});
