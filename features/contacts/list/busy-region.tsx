import type { ReactNode } from 'react';

// Its own module, so the board can use it without the list's table.
/**
 * Old rows stay at full contrast while the next ones load (spec 8.8, 8.11);
 * a thin bar on the top edge is the signal. It overlays, so nothing shifts.
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
      {busy && (
        <span
          data-loading-bar
          aria-hidden="true"
          className="bg-accent rounded-pill pointer-events-none absolute inset-x-2.5 top-0 z-[4] h-0.5 animate-pulse motion-reduce:animate-none forced-colors:bg-[Highlight]"
        />
      )}
      {children}
    </div>
  );
}
