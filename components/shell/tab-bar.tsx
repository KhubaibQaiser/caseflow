'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserRound from 'lucide-react/icons/user-round';
import { useEffect, useRef, useState } from 'react';

import type { SignOut } from './account-block';
import { NAV, isCurrent } from './nav';

const AccountSheet = dynamic(() => import('./account-sheet'), { ssr: false });

const TAB =
  'text-ink-2 aria-[current=page]:text-accent flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 bg-transparent text-[11px] font-semibold no-underline';

/** Below 768px. Sticky, clear of the home indicator. Account opens a sheet: the role must be visible here too. */
export function TabBar({ signOut }: { signOut: SignOut }) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountTab = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    // The unmounting dialog restores focus on a 0ms timer; queue ours after it so the tab wins.
    if (wasOpen.current && !accountOpen)
      setTimeout(() => accountTab.current?.focus(), 0);
    wasOpen.current = accountOpen;
  }, [accountOpen]);
  return (
    <div
      data-tab-bar
      className="border-line bg-surface sticky bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <nav aria-label="Main" className="flex h-(--tabbar)">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent(pathname, href) ? 'page' : undefined}
            className={TAB}
          >
            <Icon aria-hidden className="size-5" />
            {label}
          </Link>
        ))}
        <button
          type="button"
          ref={accountTab}
          aria-haspopup="dialog"
          onClick={() => setAccountOpen(true)}
          className={TAB}
        >
          <UserRound aria-hidden className="size-5" />
          Account
        </button>
      </nav>
      {accountOpen && (
        <AccountSheet signOut={signOut} onClose={() => setAccountOpen(false)} />
      )}
    </div>
  );
}
