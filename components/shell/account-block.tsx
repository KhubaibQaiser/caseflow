'use client';

import LogOut from 'lucide-react/icons/log-out';
import Lock from 'lucide-react/icons/lock';

import { Button } from '@/components/ui/button';
import { useViewer } from '@/lib/auth/permissions-context';
import { ROLE_LABEL } from '@/lib/contracts/permissions';
import { cn } from '@/utils/cn';

export type SignOut = () => Promise<void>;

/** `rail` collapses to icons below lg (the tablet rail); elsewhere it is always full. */
export function RoleBadge({ rail = false }: { rail?: boolean }) {
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

export function SignOutForm({
  signOut,
  rail = false,
  className,
}: {
  signOut: SignOut;
  rail?: boolean;
  className?: string;
}) {
  return (
    <form action={signOut} className={className}>
      <Button
        variant="ghost"
        size="sm"
        title="Sign out"
        type="submit"
        className={cn(rail && 'max-lg:w-[30px] max-lg:px-0', 'w-full')}
      >
        <LogOut aria-hidden className="size-4" />
        <span className={cn(rail && 'max-lg:sr-only')}>Sign out</span>
      </Button>
    </form>
  );
}

/** Sidebar footer: who you are, what you may do, and the way out. */
export function AccountBlock({ signOut }: { signOut: SignOut }) {
  return (
    <div className="border-line mt-auto flex flex-col gap-3 border-t pt-3">
      <AccountIdentity rail />
      <SignOutForm signOut={signOut} rail />
    </div>
  );
}
