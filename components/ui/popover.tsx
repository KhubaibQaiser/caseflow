'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

import { floatingClass } from './floating';

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
