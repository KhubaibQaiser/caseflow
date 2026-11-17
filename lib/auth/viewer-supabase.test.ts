import { describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
const forbidden = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('FORBIDDEN');
  }),
);
const claims = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('next/navigation', () => ({ redirect, forbidden }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    auth: { getClaims: async () => ({ data: claims.value }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { display_name: 'Sam Patel', role: 'viewer' },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

import { requirePermission } from './viewer-supabase';

describe('requirePermission without a session', () => {
  it('redirects to /login with an encoded next and reason=expired', async () => {
    await expect(
      requirePermission('contacts.read', '/contacts?q=a&b'),
    ).rejects.toThrow(
      'REDIRECT /login?next=%2Fcontacts%3Fq%3Da%26b&reason=expired',
    );
  });

  it('omits next when none is given', async () => {
    await expect(requirePermission('contacts.read')).rejects.toThrow(
      'REDIRECT /login?reason=expired',
    );
  });
});

describe('requirePermission without the permission', () => {
  it('calls Next forbidden() so forbidden.tsx renders', async () => {
    claims.value = { claims: { sub: 'u1', email: 'v@x.test' } };
    await expect(requirePermission('contacts.write')).rejects.toThrow(
      'FORBIDDEN',
    );
    expect(forbidden).toHaveBeenCalled();
  });
});
