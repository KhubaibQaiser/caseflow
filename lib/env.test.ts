import { afterEach, describe, expect, it, vi } from 'vitest';
import { secretKey, supabaseEnv } from './env';

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
});
