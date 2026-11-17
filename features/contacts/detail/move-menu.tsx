'use client';

import { useRef, useState } from 'react';
import ChevronDown from 'lucide-react/icons/chevron-down';

import { Button } from '@/components/ui/button';
import type { ContactRow } from '@/lib/contracts/contact';
import type { Status } from '@/lib/contracts/enums';
import type { Result } from '@/lib/contracts/result';

type Popup = typeof import('./move-menu-popup').default;
const load = () => import('./move-menu-popup');

type MoveMenuProps = {
  current: Status;
  /**
   * Resolves when the move settles. The caller reports failures: return `{ ok: false }` for an
   * expected one. A rejection or throw (a Server Action network failure) is treated the same way,
   * swallowed here so `pending` always clears.
   */
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
  // Not React.lazy: it caches a rejected import for good, so a flaky chunk would never retry.
  const [Popup, setPopup] = useState<{ C: Popup } | null>(null);
  // State lags a render behind a fast second select; the ref doesn't.
  const inflight = useRef(false);

  async function move(to: Status) {
    if (inflight.current) return;
    inflight.current = true;
    setPending(true);
    try {
      await onMove(to);
    } catch {
      // Same as a failed Result: the menu stays usable.
    } finally {
      inflight.current = false;
      setPending(false);
    }
  }

  // The chunk is only worth fetching for a menu that can open.
  const preload =
    disabledReason === undefined
      ? () => void load().catch(() => {})
      : undefined;

  function open(kind: 'pointer' | 'keyboard') {
    setOpened(kind);
    load().then(
      (m) => setPopup({ C: m.default }),
      // Back to the plain trigger; the next click imports again.
      () => setOpened(null),
    );
  }

  const trigger = (
    busy: boolean,
    label?: string,
    onClick?: (detail: number) => void,
  ) => (
    <Button
      variant="ghost"
      pending={busy}
      pendingLabel={label}
      aria-haspopup="menu"
      aria-expanded={false}
      disabledReason={disabledReason}
      className={className}
      onClick={onClick && ((event) => onClick(event.detail))}
      onPointerEnter={preload}
      onFocus={preload}
    >
      Move to…
      <ChevronDown aria-hidden className="size-4" />
    </Button>
  );

  if (disabledReason !== undefined || opened === null)
    return trigger(pending, 'Moving…', (detail) =>
      // detail is 0 for a click made with Enter or Space.
      open(detail === 0 ? 'keyboard' : 'pointer'),
    );
  // Chunk still loading: the normal label with a spinner, not "Moving…".
  if (Popup === null) return trigger(true);
  return (
    <Popup.C
      current={current}
      trigger={trigger(pending, 'Moving…')}
      onSelect={(to) => void move(to)}
      keyboard={opened === 'keyboard'}
    />
  );
}
