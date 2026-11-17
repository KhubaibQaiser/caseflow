'use client';

import Lock from 'lucide-react/icons/lock';
import LogOut from 'lucide-react/icons/log-out';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LazyTooltip } from '@/components/ui/lazy-tooltip';
import { useViewer } from '@/lib/auth/permissions-context';
import { ROLE_LABEL } from '@/lib/contracts/permissions';

import { AccountTrigger } from './account-trigger';
import { roleLine } from './account-block';
import type { SignOut } from './account-block';

/** Radix menu + floating-ui: loaded lazily by AccountBlock, so it stays out of every page's first load. */
export default function AccountMenu({
  signOut,
  defaultOpen = false,
}: {
  signOut: SignOut;
  /** Set when the stand-in was clicked while this code was loading. */
  defaultOpen?: boolean;
}) {
  const { displayName, role } = useViewer();
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <LazyTooltip
        content={`${displayName} · ${ROLE_LABEL[role]}`}
        side="right"
        contentClassName="lg:hidden"
      >
        <DropdownMenuTrigger asChild>
          <AccountTrigger />
        </DropdownMenuTrigger>
      </LazyTooltip>
      <DropdownMenuContent side="right" align="end">
        <div className="flex flex-col gap-0.5 px-2 pt-1 pb-1.5">
          <span className="text-13 text-ink font-semibold">{displayName}</span>
          <span className="text-ink-2 inline-flex items-center gap-1 text-xs">
            {role === 'viewer' && <Lock aria-hidden className="size-3" />}
            {roleLine(role)}
          </span>
        </div>
        <div role="separator" className="bg-line my-1 h-px" />
        <form action={signOut}>
          <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
            <button type="submit" className="w-full border-0 bg-transparent">
              <LogOut aria-hidden className="size-4" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
