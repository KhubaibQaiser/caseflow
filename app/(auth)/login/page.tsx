import type { Metadata } from 'next';

import { ThemeToggle } from '@/components/shell/theme-toggle';
import { signInAction } from '@/features/auth/actions';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Sign in · Caseflow' };

const first = (v: string | string[] | undefined) =>
  typeof v === 'string' ? v : undefined;

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  return (
    <main
      id="main"
      className="bg-canvas relative flex min-h-dvh flex-1 items-center justify-center p-4"
    >
      {/* First in DOM order, but the email field still takes focus on load. */}
      <div className="absolute end-3 top-3">
        <ThemeToggle />
      </div>
      <LoginForm
        action={signInAction}
        reason={first(params.reason) === 'expired' ? 'expired' : undefined}
        next={first(params.next)}
      />
    </main>
  );
}
