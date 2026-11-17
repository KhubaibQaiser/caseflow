// Per-request nonce CSP, set by proxy.ts. Next reads the nonce from the header and stamps its own scripts and styles.
export type CspMode = { dev: boolean; production: boolean };

export function createNonce(): string {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
  );
}

export function buildCsp(nonce: string, { dev, production }: CspMode): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // React renders style="" attributes (virtual rows, Radix positioning); a nonce can't cover attributes.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}
