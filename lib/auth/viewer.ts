import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';
import { z } from 'zod';

import { ROLE_PERMISSIONS, ROLES } from '@/lib/contracts/permissions';
import type { Role } from '@/lib/contracts/permissions';

import type { ShellViewer } from './permissions-context';

const NAME: Record<Role, string> = {
  admin: 'Alex Morgan',
  viewer: 'Sam Patel',
};

// ponytail: T22 replaces this with the real session viewer (getClaims + profiles).
// Until then the `fake-role` cookie picks the role so both states can be seen; production fails closed to the read-only Viewer.
export const getViewer = cache(async (): Promise<ShellViewer> => {
  const raw = (await cookies()).get('fake-role')?.value;
  const role =
    process.env.VERCEL_ENV === 'production'
      ? 'viewer'
      : z.enum(ROLES).catch('admin').parse(raw);
  return {
    displayName: NAME[role],
    role,
    permissions: [...ROLE_PERMISSIONS[role]],
  };
});
