'use client';

import ArrowUpDown from 'lucide-react/icons/arrow-up-down';
import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';

import type { sortLabel } from './columns';

/** The Sort menu's trigger, and its stand-in while the menu code loads. */
export function SortButton({
  label,
  className,
  ...rest
}: { label: ReturnType<typeof sortLabel>; className?: string } & Omit<
  ComponentProps<'button'>,
  'aria-label'
>) {
  return (
    <Button
      {...rest}
      variant="ghost"
      aria-label={label.name}
      className={className}
    >
      <ArrowUpDown aria-hidden className="size-4" />
      {label.text}
    </Button>
  );
}
