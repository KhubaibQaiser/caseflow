import { afterEach, describe, expect, it, vi } from 'vitest';

async function headersFor(vercelEnv: string) {
  vi.resetModules();
  vi.stubEnv('VERCEL_ENV', vercelEnv);
  const { default: config } = await import('./next.config');
  const [rule] = (await config.headers?.()) ?? [];
  return Object.fromEntries((rule?.headers ?? []).map((h) => [h.key, h.value]));
}

afterEach(() => vi.unstubAllEnvs());

describe('static security headers', () => {
  it('sends HSTS without preload, in production only', async () => {
    expect((await headersFor('production'))['Strict-Transport-Security']).toBe(
      'max-age=63072000; includeSubDomains',
    );
    expect(await headersFor('preview')).not.toHaveProperty(
      'Strict-Transport-Security',
    );
  });

  it('always sends the rest and drops interest-cohort', async () => {
    const h = await headersFor('preview');
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(h['Permissions-Policy']).toContain('camera=()');
    expect(h['Permissions-Policy']).not.toContain('interest-cohort');
  });
});

describe('server actions', () => {
  it('sets an explicit body size limit', async () => {
    vi.resetModules();
    const { default: config } = await import('./next.config');
    expect(config.experimental?.serverActions?.bodySizeLimit).toBe('1mb');
  });
});
