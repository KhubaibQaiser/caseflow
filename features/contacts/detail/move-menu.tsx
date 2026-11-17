'use client';

import { Suspense, lazy, useRef, useState } from 'react';
import ChevronDown from 'lucide-react/icons/chevron-down';

import { Button } from '@/components/ui/button';
import type { ContactRow } from '@/lib/contracts/contact';
import type { Status } from '@/lib/contracts/enums';
import type { Result } from '@/lib/contracts/result';

const load = () => import('./move-menu-popup');
const Popup = lazy(load);

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
  // How the first click happened; null until then, and the menu code isn't loaded.
  const [opened, setOpened] = useState<'pointer' | 'keyboard' | null>(null);
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

  const trigger = (busy: boolean, onClick?: (detail: number) => void) => (
    <Button
      variant="ghost"
      pending={busy}
      pendingLabel="Moving…"
      disabledReason={disabledReason}
      className={className}
      onClick={onClick && ((event) => onClick(event.detail))}
      onPointerEnter={() => void load()}
      onFocus={() => void load()}
    >
      Move to…
      <ChevronDown aria-hidden className="size-4" />
    </Button>
  );

  if (disabledReason !== undefined || opened === null)
    return trigger(pending, (detail) =>
      // detail is 0 for a click made with Enter or Space.
      setOpened(detail === 0 ? 'keyboard' : 'pointer'),
    );
  return (
    <Suspense fallback={trigger(true)}>
      <Popup
        current={current}
        trigger={trigger(pending)}
        onSelect={(to) => void move(to)}
        keyboard={opened === 'keyboard'}
      />
    </Suspense>
  );
}
