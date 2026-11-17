import { afterEach, describe, expect, it, vi } from 'vitest';
import { authEnforced, devRoutesEnabled, secretKey, supabaseEnv } from './env';

afterEach(() => vi.unstubAllEnvs());

describe('env', () => {
  it('names the missing variable', () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'k');
    expect(() => supabaseEnv()).toThrow(/SUPABASE_URL/);
  });

  it('returns url and key when set', () => {
    vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'k');
    expect(supabaseEnv()).toEqual({ url: 'http://127.0.0.1:54321', key: 'k' });
  });

  it('requires the secret key by name', () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    expect(() => secretKey()).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it('enforces auth unless AUTH_ENFORCED is exactly "false"', () => {
    vi.stubEnv('AUTH_ENFORCED', '');
    expect(authEnforced()).toBe(true);
    vi.stubEnv('AUTH_ENFORCED', 'true');
    expect(authEnforced()).toBe(true);
    vi.stubEnv('AUTH_ENFORCED', 'FALSE');
    expect(authEnforced()).toBe(true);
    vi.stubEnv('AUTH_ENFORCED', 'false');
    expect(authEnforced()).toBe(false);
  });

  it('opens /dev outside production, or in a production build only with the e2e flag', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(devRoutesEnabled()).toBe(true);
    // Vercel preview and production are both NODE_ENV=production.
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('E2E_DEV_ROUTES', '');
    expect(devRoutesEnabled()).toBe(false);
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(devRoutesEnabled()).toBe(false);
    vi.stubEnv('E2E_DEV_ROUTES', '1');
    expect(devRoutesEnabled()).toBe(true);
  });
});
