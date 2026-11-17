'use client';

import { Suspense, lazy, useState } from 'react';

import LogOut from 'lucide-react/icons/log-out';
import Lock from 'lucide-react/icons/lock';

import { Button } from '@/components/ui/button';
import { useViewer } from '@/lib/auth/permissions-context';
import { ROLE_LABEL } from '@/lib/contracts/permissions';

import { AccountTrigger } from './account-trigger';

export type SignOut = () => Promise<void>;

export function roleLine(role: keyof typeof ROLE_LABEL) {
  return `${ROLE_LABEL[role]}${role === 'viewer' ? ' · read-only' : ''}`;
}

/** The mobile Account sheet's name and role badge. */
export function AccountIdentity() {
  const { displayName, role } = useViewer();
  return (
    <div className="flex flex-col gap-1">
      <span className="text-ink text-13 font-semibold">{displayName}</span>
      <span className="text-ink-2 border-lead-border rounded-pill inline-flex items-center gap-1 self-start border px-1.75 text-xs leading-4.5 font-semibold">
        {role === 'viewer' && <Lock aria-hidden className="size-2.75" />}
        {roleLine(role)}
      </span>
    </div>
  );
}

/** The bordered Sign out button for the mobile Account sheet. */
export function SignOutForm({
  signOut,
  className,
}: {
  signOut: SignOut;
  className?: string;
}) {
  return (
    <form action={signOut} className={className}>
      <Button variant="ghost" size="sm" type="submit" className="w-full">
        <LogOut aria-hidden className="size-4" />
        Sign out
      </Button>
    </form>
  );
}

/** Radix menu + floating-ui load on first hover, focus or click; the stand-in trigger shows until then. */
export const preloadAccountMenu = () => import('./account-menu');
const AccountMenu = lazy(preloadAccountMenu);

/**
 * Sidebar footer: one menu trigger. From lg it is a "Name · Role" row; on the rail it is
 * a 32px initials avatar whose corner badge (shield or lock) carries the role by shape.
 */
export function AccountBlock({ signOut }: { signOut: SignOut }) {
  // A click on the stand-in, before the menu code arrives, opens the menu as soon as it mounts.
  const [wantOpen, setWantOpen] = useState(false);
  return (
    <div className="border-line mt-auto border-t pt-3 max-lg:flex max-lg:justify-center">
      <Suspense
        fallback={
          <AccountTrigger
            onPointerEnter={() => void preloadAccountMenu()}
            onFocus={() => void preloadAccountMenu()}
            onClick={() => setWantOpen(true)}
          />
        }
      >
        <AccountMenu signOut={signOut} defaultOpen={wantOpen} />
      </Suspense>
    </div>
  );
}
