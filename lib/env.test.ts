import { afterEach, describe, expect, it, vi } from 'vitest';
import { authEnforced, secretKey, supabaseEnv } from './env';

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

  it('reads AUTH_ENFORCED as a boolean that defaults to false', () => {
    vi.stubEnv('AUTH_ENFORCED', '');
    expect(authEnforced()).toBe(false);
    vi.stubEnv('AUTH_ENFORCED', 'true');
    expect(authEnforced()).toBe(true);
    vi.stubEnv('AUTH_ENFORCED', 'false');
    expect(authEnforced()).toBe(false);
  });
});
