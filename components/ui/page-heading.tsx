'use client';

import { useEffect, useRef } from 'react';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

// The page's h1, focused on mount so keyboard and screen reader users start at what changed.
export function PageHeading({
  className,
  children,
  focusOnMount = true,
  ...rest
}: ComponentProps<'h1'> & {
  /** Off where another control takes first focus (the login email). */
  focusOnMount?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);
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
