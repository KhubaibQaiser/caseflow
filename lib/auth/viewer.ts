import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fail, ok, type Result } from '@/lib/contracts/result';
import {
  ROLE_PERMISSIONS,
  ROLES,
  type Permission,
  type Viewer,
} from '@/lib/contracts/permissions';
import { createServerSupabase } from '@/lib/supabase/server';

// Rendered as ForbiddenState by app/(app)/layout; forbidden() is still experimental (authInterrupts).
export class ForbiddenError extends Error {
  override name = 'ForbiddenError';
}

const Profile = z.object({ display_name: z.string(), role: z.enum(ROLES) });

// getClaims verifies the JWT signature; the role is read live from profiles.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const db = await createServerSupabase();
  const { data } = await db.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return null;
  const { data: row } = await db
    .from('profiles')
    .select('display_name, role')
    .eq('user_id', id)
    .maybeSingle();
  const p = Profile.safeParse(row);
  if (!p.success) return null;
  return {
    id,
    email: data.claims.email ?? '',
    displayName: p.data.display_name,
    role: p.data.role,
    permissions: [...ROLE_PERMISSIONS[p.data.role]],
  };
});

export async function requirePermission(p: Permission): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect('/login?reason=expired');
  if (!v.permissions.includes(p)) throw new ForbiddenError(p);
  return v;
}

export async function assertPermission(p: Permission): Promise<Result<Viewer>> {
  const v = await getViewer();
  if (!v) return fail('unauthorized', 'Sign in again to continue.');
  if (!v.permissions.includes(p))
    return fail('forbidden', 'You do not have permission to do that.');
  return ok(v);
}
