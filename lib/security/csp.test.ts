import { describe, expect, it } from 'vitest';

import { buildCsp, createNonce } from './csp';

const dev = { dev: true, production: false };
const prod = { dev: false, production: true };
const directive = (csp: string, name: string) =>
  csp
    .split('; ')
    .find((d) => d === name || d.startsWith(`${name} `))
    ?.slice(name.length)
    .trim();

describe('createNonce', () => {
  it('is unique per call and base64', () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});

describe('buildCsp', () => {
  it('carries the nonce and locks the document down', () => {
    const csp = buildCsp('abc', prod);
    expect(directive(csp, 'default-src')).toBe("'self'");
    expect(directive(csp, 'script-src')).toBe(
      "'self' 'nonce-abc' 'strict-dynamic'",
    );
    expect(directive(csp, 'style-src')).toBe("'self' 'unsafe-inline'");
    expect(directive(csp, 'img-src')).toBe("'self' data: blob:");
    expect(directive(csp, 'font-src')).toBe("'self'");
    expect(directive(csp, 'connect-src')).toBe("'self'");
    expect(directive(csp, 'frame-ancestors')).toBe("'none'");
    expect(directive(csp, 'base-uri')).toBe("'self'");
    expect(directive(csp, 'form-action')).toBe("'self'");
    expect(directive(csp, 'object-src')).toBe("'none'");
  });

  it('allows eval and skips the https upgrade in dev only', () => {
    expect(buildCsp('n', dev)).toContain("'unsafe-eval'");
    expect(buildCsp('n', dev)).not.toContain('upgrade-insecure-requests');
    expect(buildCsp('n', prod)).not.toContain('unsafe-eval');
    expect(buildCsp('n', prod)).toContain('upgrade-insecure-requests');
  });

  it('does not upgrade requests outside production', () => {
    expect(buildCsp('n', { dev: false, production: false })).not.toContain(
      'upgrade-insecure-requests',
    );
  });
});
