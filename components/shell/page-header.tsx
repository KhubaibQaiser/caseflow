import type { ReactNode } from 'react';

/**
 * md+: the page's top row stays put on scroll, over a canvas strip that also covers main's top padding (the
 * pt and -mt cancel, so nothing moves). pe-17 keeps clear of the theme button (fixed at the right, 24px in).
 * Below md the top bar is the sticky one.
 */
export const stickyTop =
  'md:sticky md:top-0 md:z-20 md:bg-canvas md:-mx-6 md:-mt-4.5 md:ps-6 md:pe-17 md:pt-4.5';

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  /** Counts and qualifiers beside the title, e.g. "1,284 of 2,437". */
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    // One row at every width: the title truncates, the action never shrinks, and the count gives way
    // under 360px so the title still reads at 320 (WCAG reflow). min-h: the same height with or
    // without the 34px action, so roles and the skeleton line up.
    <header
      className={`flex min-h-8.5 items-center gap-x-2.5 md:min-h-13 ${stickyTop}`}
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
        <h1 className="text-ink m-0 min-w-0 truncate text-xl font-semibold tracking-tight">
          {title}
        </h1>
        {meta && (
          <span className="text-ink-2 tnum shrink-0 text-sm max-[359px]:hidden">
            {meta}
          </span>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
