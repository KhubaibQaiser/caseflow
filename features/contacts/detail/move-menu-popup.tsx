'use client';

import { useRef } from 'react';
import type { FocusEvent, ReactElement } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusPill } from '@/components/ui/pill';
import { STATUSES, type Status } from '@/lib/contracts/enums';

/** The Radix menu itself, split from MoveMenu so its ~25 kB loads on the first click, not with the page. */
export default function MoveMenuPopup({
  current,
  trigger,
  onSelect,
  keyboard,
}: {
  current: Status;
  trigger: ReactElement;
  onSelect(to: Status): void;
  /** Opened from the keyboard: Radix missed that keydown (it mounted after it), so focus the first item ourselves. */
  keyboard: boolean;
}) {
  const pending = useRef(keyboard);
  // Radix puts focus on the menu itself as it opens; hand it to the first item, once.
  function onFirstFocus(event: FocusEvent<HTMLElement>) {
    if (!pending.current || event.target !== event.currentTarget) return;
    pending.current = false;
    event.currentTarget
      .querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus();
  }

  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" onFocus={onFirstFocus}>
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        {STATUSES.filter((s) => s !== current).map((s) => (
          <DropdownMenuItem key={s} onSelect={() => onSelect(s)}>
            <StatusPill status={s} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
