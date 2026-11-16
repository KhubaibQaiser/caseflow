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
    <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-2">
      <h1 className="text-ink m-0 text-xl font-semibold tracking-tight md:text-[22px]">
        {title}
      </h1>
      {meta && <span className="text-ink-2 tnum text-sm">{meta}</span>}
      {actions && (
        <div className="ml-auto flex items-center gap-2 self-center">
          {actions}
        </div>
      )}
    </header>
  );
}
