import { useId } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

/** A titled surface. The count sits in the heading so it reads as "Notes 2". */
export function Panel({
  title,
  count,
  className,
  children,
}: {
  title: string;
  count?: number;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'border-line bg-surface rounded-surface border px-4 py-3.5',
        className,
      )}
    >
      <h2 id={id} className="text-ink text-13 m-0 mb-2.5 font-semibold">
        {title}
        {count !== undefined && (
          <span className="text-ink-2 tnum ml-1 font-medium">{count}</span>
        )}
      </h2>
      {children}
    </section>
  );
}
