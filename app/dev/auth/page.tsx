import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { devRoutesEnabled } from '@/lib/env';

import { NoAccessState } from '@/components/shell/no-access-state';
import { LoginForm } from '@/features/auth/login-form';
import { fail, type Result } from '@/lib/contracts/result';

export const metadata: Metadata = { title: 'Auth states · Caseflow' };

// Dev only: the login form wired to canned results (?stub=invalid|rate|server|slow, ?reason=expired, ?view=no-access).
export default async function AuthStates({
  searchParams,
}: PageProps<'/dev/auth'>) {
  if (!devRoutesEnabled()) notFound();
  const { stub, reason, view } = await searchParams;

  async function signOut() {
    'use server';
  }
  if (view === 'no-access') return <NoAccessState signOut={signOut} />;

  async function action(): Promise<Result<null>> {
    'use server';
    if (stub === 'slow') await new Promise((r) => setTimeout(r, 60_000));
    if (stub === 'rate')
      return fail(
        'rate_limited',
        'Too many attempts. Try again in 5 minutes.',
        {
          retryAfter: 300,
        },
      );
    if (stub === 'server')
      return fail('server', 'Could not sign in. Try again.');
    return fail('invalid_credentials', 'Email or password is incorrect.');
  }
  return (
    <main className="bg-canvas flex min-h-dvh flex-1 items-center justify-center p-4">
      <LoginForm
        action={action}
        reason={reason === 'expired' ? 'expired' : undefined}
      />
    </main>
  );
}
