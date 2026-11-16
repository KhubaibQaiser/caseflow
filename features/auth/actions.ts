'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignInSchema } from '@/lib/contracts/auth';
import { fail, zodFieldErrors, type Result } from '@/lib/contracts/result';
import { resolveTimeZone } from '@/lib/dates/date-only';
import { createSignInClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { safeNext } from './safe-next';

const YEAR = 31_536_000;
// supabase-js does not expose Retry-After, so a 429 always reports this default (seconds).
const DEFAULT_RETRY_SECONDS = 300;

export async function signInAction(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = SignInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success)
    return fail('validation', 'Fix the highlighted fields.', {
      fieldErrors: zodFieldErrors(parsed.error),
    });

  const ip =
    (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const { data, error } = await createSignInClient(ip).auth.signInWithPassword(
    parsed.data,
  );
  if (error || !data.session) {
    if (error?.code === 'invalid_credentials')
      return fail('invalid_credentials', 'Email or password is incorrect.');
    if (error?.status === 429) {
      const minutes = Math.max(1, Math.ceil(DEFAULT_RETRY_SECONDS / 60));
      return fail(
        'rate_limited',
        `Too many attempts. Try again in ${minutes} minutes.`,
        { retryAfter: DEFAULT_RETRY_SECONDS },
      );
    }
    return fail('server', 'Could not sign in. Try again.');
  }

  const { error: sessionError } = await (
    await createServerSupabase()
  ).auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (sessionError) return fail('server', 'Could not sign in. Try again.');

  const tz = formData.get('tz');
  (await cookies()).set(
    'tz',
    resolveTimeZone(typeof tz === 'string' ? tz : null),
    {
      path: '/',
      maxAge: YEAR,
      sameSite: 'lax',
    },
  );
  redirect(safeNext(formData.get('next')) ?? '/contacts');
}

export async function signOutAction(): Promise<never> {
  // Local scope: reviewers share one account, so don't revoke everyone's session.
  await (await createServerSupabase()).auth.signOut({ scope: 'local' });
  redirect('/login');
}
