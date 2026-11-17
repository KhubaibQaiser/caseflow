import type { ReactNode } from 'react';

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
    <header className="flex min-h-[34px] items-center gap-x-2.5">
      <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
        <h1 className="text-ink m-0 min-w-0 truncate text-xl font-semibold tracking-tight md:text-[22px]">
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
