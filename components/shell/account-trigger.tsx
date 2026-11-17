import ChevronsUpDown from 'lucide-react/icons/chevrons-up-down';
import Lock from 'lucide-react/icons/lock';
import ShieldCheck from 'lucide-react/icons/shield-check';
import type { ComponentProps } from 'react';

import { useViewer } from '@/lib/auth/permissions-context';
import { ROLE_LABEL } from '@/lib/contracts/permissions';
import { initials } from '@/utils/initials';

/** The menu trigger, and its stand-in while the menu code loads. */
export function AccountTrigger(
  props: Omit<ComponentProps<'button'>, 'aria-label'>,
) {
  const { displayName, role } = useViewer();
  const viewer = role === 'viewer';
  const RoleIcon = viewer ? Lock : ShieldCheck;
  return (
    <button
      type="button"
      {...props}
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
  );
}
