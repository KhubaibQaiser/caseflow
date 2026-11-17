import type { ReactNode } from 'react';

// Its own module, so the board can use it without the list's table.
/**
 * Old rows stay at full contrast while the next ones load (spec 8.8, 8.11). Only aria-busy marks it:
 * a bar or line over the table read as a stray border.
 */
export function BusyRegion({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-busy={busy || undefined}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      {children}
    </div>
  );
}
