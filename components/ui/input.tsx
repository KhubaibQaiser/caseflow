'use client';

import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

import { useFieldControl } from './field';

export const controlClass =
  'w-full rounded-ctl border border-control-border bg-surface px-2.5 text-base text-ink transition-colors sm:text-13 duration-150 placeholder:text-ink-2 enabled:not-aria-invalid:hover:border-ink-2 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-2 focus-visible:border-accent focus-visible:outline-1 focus-visible:outline-offset-0 aria-invalid:border-overdue aria-invalid:focus-visible:outline-overdue';

/** Text input. Inside a Field it picks up id, aria-invalid and aria-describedby. */
export function Input({ className, ...props }: ComponentProps<'input'>) {
  const field = useFieldControl(props['aria-describedby']);
  return (
    <input
      {...field}
      {...props}
      aria-describedby={field['aria-describedby']}
      className={cn(controlClass, 'h-9', className)}
    />
  );
}
