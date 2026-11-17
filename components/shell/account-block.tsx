'use client';

import ChevronsUpDown from 'lucide-react/icons/chevrons-up-down';
import LogOut from 'lucide-react/icons/log-out';
import Lock from 'lucide-react/icons/lock';
import ShieldCheck from 'lucide-react/icons/shield-check';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LazyTooltip } from '@/components/ui/lazy-tooltip';
import { useViewer } from '@/lib/auth/permissions-context';
import { ROLE_LABEL } from '@/lib/contracts/permissions';
import { initials } from '@/utils/initials';

export type SignOut = () => Promise<void>;

function roleLine(role: keyof typeof ROLE_LABEL) {
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

/**
 * Sidebar footer: one menu trigger. From lg it is a "Name · Role" row; on the rail it is
 * a 32px initials avatar whose corner badge (shield or lock) carries the role by shape.
 */
export function AccountBlock({ signOut }: { signOut: SignOut }) {
  const { displayName, role } = useViewer();
  const viewer = role === 'viewer';
  const RoleIcon = viewer ? Lock : ShieldCheck;
  return (
    <div className="border-line mt-auto border-t pt-3 max-lg:flex max-lg:justify-center">
      <DropdownMenu>
        <LazyTooltip
          content={`${displayName} · ${ROLE_LABEL[role]}`}
          side="right"
          contentClassName="lg:hidden"
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account: ${displayName}, ${ROLE_LABEL[role]}`}
              className="text-13 text-ink hover:bg-canvas rounded-ctl flex min-h-8 cursor-pointer items-center gap-1 border-0 bg-transparent p-0 max-lg:size-8 max-lg:justify-center max-lg:rounded-full lg:w-full lg:px-2.5"
            >
              <span
                aria-hidden
                className="bg-accent-soft text-accent relative inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-wide lg:hidden"
              >
                {initials(displayName)}
                <span className="bg-surface border-line text-ink-2 absolute -right-0.75 -bottom-0.75 grid size-4 place-items-center rounded-full border">
                  <RoleIcon className="size-2.5" />
                </span>
              </span>
              <span
                aria-hidden
                className="flex min-w-0 flex-1 items-center gap-1.5 max-lg:hidden"
              >
                <span className="truncate font-semibold">{displayName}</span>{' '}
                <span className="text-ink-2 inline-flex shrink-0 items-center gap-0.75 font-medium">
                  <span>·</span> {viewer && <Lock className="size-3" />}
                  {ROLE_LABEL[role]}
                </span>
                <ChevronsUpDown className="text-ink-2 ml-auto size-3.5 shrink-0" />
              </span>
            </button>
          </DropdownMenuTrigger>
        </LazyTooltip>
        <DropdownMenuContent side="right" align="end">
          <div className="flex flex-col gap-0.5 px-2 pt-1 pb-1.5">
            <span className="text-13 text-ink font-semibold">
              {displayName}
            </span>
            <span className="text-ink-2 inline-flex items-center gap-1 text-xs">
              {viewer && <Lock aria-hidden className="size-3" />}
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
    </div>
  );
}
