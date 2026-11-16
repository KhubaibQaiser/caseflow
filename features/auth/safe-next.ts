// Same-origin relative paths only. Browsers drop tabs and newlines inside URLs,
// so "/\t/evil.com" would become "//evil.com"; control characters and "\" are refused.
export function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  return raw;
}
