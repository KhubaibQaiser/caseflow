import { afterEach, describe, expect, it, vi } from 'vitest';

let role: string | undefined;
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'fake-role' && role ? { value: role } : undefined,
  }),
}));

import { getViewer } from './viewer';

afterEach(() => {
  vi.unstubAllEnvs();
  role = undefined;
});

describe('fake getViewer', () => {
  it('fails closed in production: always the read-only Viewer, whatever the cookie says', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    role = 'admin';
    const v = await getViewer();
    expect(v.role).toBe('viewer');
    expect(v.permissions).not.toContain('contacts.write');
  });

  it('outside production the fake-role cookie picks the role', async () => {
    role = 'viewer';
    expect((await getViewer()).role).toBe('viewer');
    role = 'admin';
    expect((await getViewer()).role).toBe('admin');
  });

  it('outside production an unknown cookie falls back to admin', async () => {
    role = 'root';
    expect((await getViewer()).role).toBe('admin');
  });
});
