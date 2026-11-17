import { redirect } from 'next/navigation';

import { MobileTopBar } from '@/components/shell/mobile-top-bar';
import { Sidebar } from '@/components/shell/sidebar';
import { TabBar } from '@/components/shell/tab-bar';
import { TimezoneSync } from '@/components/shell/timezone-sync';
import { NoAccessState } from '@/components/shell/no-access-state';
import { signOutAction as signOut } from '@/features/auth/actions';
import { PermissionsProvider } from '@/lib/auth/permissions-context';
import { getViewer, NoProfileError } from '@/lib/auth/viewer';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  let viewer;
  try {
    viewer = await getViewer();
  } catch (e) {
    // Never /login: the proxy would bounce a signed-in user straight back.
    if (e instanceof NoProfileError)
      return (
        <main id="main" tabIndex={-1} className="flex min-h-dvh flex-col">
          <NoAccessState signOut={signOut} />
        </main>
      );
    throw e;
  }
  // The proxy normally catches this first; this covers AUTH_ENFORCED=false and races.
  if (!viewer) redirect('/login?reason=expired');
  return (
    <PermissionsProvider
      viewer={{
        displayName: viewer.displayName,
        role: viewer.role,
        permissions: viewer.permissions,
      }}
    >
      <TimezoneSync />
      <a
        href="#main"
        className="bg-surface text-ink border-line rounded-ctl shadow-raised fixed top-2 left-2 z-50 -translate-y-16 border px-3 py-2 text-sm font-semibold focus:translate-y-0"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <Sidebar signOut={signOut} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main
            id="main"
            tabIndex={-1}
            className="flex flex-1 flex-col px-4 pt-3.5 pb-4 outline-none md:px-6 md:pt-4.5"
          >
            {children}
          </main>
          <TabBar signOut={signOut} />
        </div>
      </div>
    </PermissionsProvider>
  );
}
