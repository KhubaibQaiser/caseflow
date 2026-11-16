import { describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
);
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabase: async () => ({
    auth: { getClaims: async () => ({ data: null }) },
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
