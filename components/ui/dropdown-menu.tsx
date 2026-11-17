'use client';

import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';
import Check from 'lucide-react/icons/check';

import { cn } from '@/utils/cn';

import { floatingClass } from './floating';

// Non-modal, like the WAI-ARIA menu button: no aria-hidden over the page (axe aria-hidden-focus) and no scroll lock.
export function DropdownMenu({
  modal = false,
  ...props
}: ComponentProps<typeof RadixMenu.Root>) {
  return <RadixMenu.Root modal={modal} {...props} />;
}
export const DropdownMenuTrigger = RadixMenu.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = 'start',
  ...props
}: ComponentProps<typeof RadixMenu.Content>) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={8}
        className={cn(
          floatingClass,
          'min-w-[180px] origin-(--radix-dropdown-menu-content-transform-origin) p-1.5',
          className,
        )}
        {...props}
      />
    </RadixMenu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof RadixMenu.Item>) {
  return (
    <RadixMenu.Item
      className={cn(
        'text-13 text-ink data-highlighted:bg-canvas focus-visible:outline-accent flex min-h-8 cursor-pointer items-center gap-2 rounded-[5px] px-2 outline-none select-none focus-visible:shadow-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid data-disabled:cursor-not-allowed data-disabled:opacity-45',
        'forced-colors:data-highlighted:bg-[Highlight] forced-colors:data-highlighted:text-[HighlightText] forced-colors:data-highlighted:forced-color-adjust-none',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof RadixMenu.Label>) {
  return (
    <RadixMenu.Label
      className={cn('text-ink-2 px-2 pt-1 pb-1.5 text-xs', className)}
      {...props}
    />
  );
}

export const DropdownMenuRadioGroup = RadixMenu.RadioGroup;

/** One-of-many inside a menu (menuitemradio), with a check on the chosen item. */
export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof RadixMenu.RadioItem>) {
  return (
    <RadixMenu.RadioItem
      className={cn(
        'text-13 text-ink data-highlighted:bg-canvas focus-visible:outline-accent flex min-h-8 cursor-pointer items-center gap-2 rounded-[5px] pr-2 pl-7 outline-none select-none focus-visible:shadow-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid data-[state=checked]:font-semibold',
        'forced-colors:data-highlighted:bg-[Highlight] forced-colors:data-highlighted:text-[HighlightText] forced-colors:data-highlighted:forced-color-adjust-none',
        'relative',
        className,
      )}
      {...props}
    >
      <RadixMenu.ItemIndicator className="absolute left-2 inline-flex">
        <Check aria-hidden className="text-accent size-3.5" />
      </RadixMenu.ItemIndicator>
      {children}
    </RadixMenu.RadioItem>
  );
}
