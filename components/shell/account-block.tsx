'use client';

import LogOut from 'lucide-react/icons/log-out';
import Lock from 'lucide-react/icons/lock';

import { Button } from '@/components/ui/button';
import { LazyTooltip } from '@/components/ui/lazy-tooltip';
import { useViewer } from '@/lib/auth/permissions-context';
import { ROLE_LABEL } from '@/lib/contracts/permissions';
import { cn } from '@/utils/cn';

export type SignOut = () => Promise<void>;

/** `rail` collapses to icons below lg (the tablet rail); elsewhere it is always full. */
function RoleBadge({ rail = false }: { rail?: boolean }) {
  const { role } = useViewer();
  const viewer = role === 'viewer';
  return (
    <span
      className={cn(
        'text-ink-2 border-lead-border inline-flex items-center gap-1 self-start border px-[7px] text-[11px] leading-[18px] font-semibold',
        'rounded-pill',
        rail &&
          'max-lg:rounded-ctl max-lg:flex-col max-lg:gap-0 max-lg:self-center max-lg:px-1.5',
      )}
    >
      {viewer && <Lock aria-hidden className="size-[11px]" />}
      <span>
        {ROLE_LABEL[role]}
        {viewer && (
          <span className={cn(rail && 'max-lg:hidden')}> · read-only</span>
        )}
      </span>
    </span>
  );
}

export function AccountIdentity({ rail = false }: { rail?: boolean }) {
  const { displayName } = useViewer();
  return (
    <div className={cn('flex flex-col gap-1', rail && 'max-lg:items-center')}>
      <span
        className={cn(
          'text-ink text-13 font-semibold',
          rail && 'max-lg:sr-only',
        )}
      >
        {displayName}
      </span>
      <RoleBadge rail={rail} />
    </div>
  );
}

/**
 * `rail`: the sidebar's quiet text link (icon only on the tablet rail, tooltip there).
 * Otherwise the bordered button for the mobile Account sheet, whose label is already visible.
 */
export function SignOutForm({
  signOut,
  rail = false,
  className,
}: {
  signOut: SignOut;
  rail?: boolean;
  className?: string;
}) {
  if (!rail)
    return (
      <form action={signOut} className={className}>
        <Button variant="ghost" size="sm" type="submit" className="w-full">
          <LogOut aria-hidden className="size-4" />
          Sign out
        </Button>
      </form>
    );
  return (
    <form
      action={signOut}
      className={cn(className, 'max-lg:flex max-lg:justify-center')}
    >
      <LazyTooltip content="Sign out" side="right" contentClassName="lg:hidden">
        <button
          type="submit"
          className="text-ink-2 hover:text-ink rounded-ctl text-13 inline-flex min-h-6 cursor-pointer items-center justify-center gap-0 border-0 bg-transparent font-medium max-lg:size-[30px] lg:-ml-1 lg:px-1"
        >
          <LogOut aria-hidden className="size-4 lg:hidden" />
          <span className="max-lg:sr-only">Sign out</span>
        </button>
      </LazyTooltip>
    </form>
  );
}

/** Sidebar footer: who you are, what you may do, and the way out. */
export function AccountBlock({ signOut }: { signOut: SignOut }) {
  return (
    <div className="border-line mt-auto flex flex-col gap-1 border-t pt-3 lg:px-2.5">
      <AccountIdentity rail />
      <SignOutForm signOut={signOut} rail />
    </div>
  );
}
