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

// Signed in, but no profiles row. The (app) layer renders the No access state
// ("No access." / "Your account isn't set up yet. Ask an admin." plus Sign out).
// Never redirect to /login for this: the proxy would bounce the user back.
export class NoProfileError extends Error {
  override name = 'NoProfileError';
}

const Profile = z.object({ display_name: z.string(), role: z.enum(ROLES) });

// getClaims verifies the JWT signature; the role is read live from profiles.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const db = await createServerSupabase();
  const { data } = await db.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return null;
  const { data: row, error } = await db
    .from('profiles')
    .select('display_name, role')
    .eq('user_id', id)
    .maybeSingle();
  // A failed query is a server fault (error boundary), never "signed out".
  if (error)
    throw new Error('Could not load the profile', { cause: error.code });
  if (!row) throw new NoProfileError();
  const p = Profile.safeParse(row);
  if (!p.success) throw new Error('Invalid profile row');
  return {
    id,
    email: data.claims.email ?? '',
    displayName: p.data.display_name,
    role: p.data.role,
    permissions: [...ROLE_PERMISSIONS[p.data.role]],
  };
});

// `next` is the path to return to after signing in again.
export async function requirePermission(
  p: Permission,
  next?: string,
): Promise<Viewer> {
  const v = await getViewer();
  if (!v) {
    const qs = new URLSearchParams(next ? { next } : {});
    qs.set('reason', 'expired');
    redirect(`/login?${qs}`);
  }
  if (!v.permissions.includes(p)) throw new ForbiddenError(p);
  return v;
}

export async function assertPermission(p: Permission): Promise<Result<Viewer>> {
  let v: Viewer | null;
  try {
    v = await getViewer();
  } catch (e) {
    if (e instanceof NoProfileError)
      return fail('forbidden', "Your account isn't set up yet. Ask an admin.");
    throw e;
  }
  if (!v) return fail('unauthorized', 'Sign in again to continue.');
  if (!v.permissions.includes(p))
    return fail('forbidden', 'You do not have permission to do that.');
  return ok(v);
}
