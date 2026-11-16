'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

/** Shared by popovers and menus: a floating surface. The 1px border keeps its edge in forced colours. */
export const floatingClass =
  'z-50 rounded-lg border border-line bg-surface shadow-float data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverClose = RadixPopover.Close;

export function PopoverContent({
  className,
  sideOffset = 6,
  align = 'start',
  ...props
}: ComponentProps<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={8}
        className={cn(
          floatingClass,
          'origin-(--radix-popover-content-transform-origin) p-3',
          className,
        )}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
