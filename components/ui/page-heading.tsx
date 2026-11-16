'use client';

import { useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

// The page's h1, focused on mount so keyboard and screen reader users start at what changed.
export function PageHeading({
  className,
  children,
  ...rest
}: ComponentProps<'h1'>) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <h1
      {...rest}
      ref={ref}
      tabIndex={-1}
      // Not a control, so no focus ring when focus is moved here.
      className={cn('outline-none focus-visible:shadow-none', className)}
    >
      {children}
    </h1>
  );
}
