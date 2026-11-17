'use client';

import type { ComponentProps } from 'react';
import ChevronDown from 'lucide-react/icons/chevron-down';

import { useFieldControl } from '@/components/ui/field';
import { controlClass } from '@/components/ui/input';
import { cn } from '@/utils/cn';

/** A native select (best keyboard and mobile behaviour) in the control style. Inside a Field it picks up id and aria-*. */
export function NativeSelect({
  className,
  children,
  ...props
}: ComponentProps<'select'>) {
  const field = useFieldControl(props['aria-describedby']);
  return (
    <div className="relative">
      <select
        {...field}
        {...props}
        aria-describedby={field['aria-describedby']}
        className={cn(
          controlClass,
          'h-9 cursor-pointer appearance-none pr-8',
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-ink-2 pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </div>
  );
}
