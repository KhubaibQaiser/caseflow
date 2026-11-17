'use client';

import { useRef, useState } from 'react';
import ChevronDown from 'lucide-react/icons/chevron-down';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusPill } from '@/components/ui/pill';
import type { ContactRow } from '@/lib/contracts/contact';
import { STATUSES, type Status } from '@/lib/contracts/enums';
import type { Result } from '@/lib/contracts/result';

type MoveMenuProps = {
  current: Status;
  /** Resolves when the move settles; the caller reports failures. */
  onMove(to: Status): Promise<Result<ContactRow>>;
  /** Blocks the menu (still focusable) and says why. */
  disabledReason?: string;
  className?: string;
};

/** "Move to…": the other two statuses as pills. The keyboard and menu alternative to dragging (WCAG 2.5.7). */
export function MoveMenu({
  current,
  onMove,
  disabledReason,
  className,
}: MoveMenuProps) {
  const [pending, setPending] = useState(false);
  // State lags a render behind a fast second select; the ref doesn't.
  const inflight = useRef(false);

  async function move(to: Status) {
    if (inflight.current) return;
    inflight.current = true;
    setPending(true);
    try {
      await onMove(to);
    } finally {
      inflight.current = false;
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          pending={pending}
          pendingLabel="Moving…"
          disabledReason={disabledReason}
          className={className}
        >
          Move to…
          <ChevronDown aria-hidden className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        {STATUSES.filter((s) => s !== current).map((s) => (
          <DropdownMenuItem key={s} onSelect={() => void move(s)}>
            <StatusPill status={s} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
