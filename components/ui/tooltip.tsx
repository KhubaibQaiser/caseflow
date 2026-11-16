'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactElement, ReactNode } from 'react';

type TooltipProps = {
  content: ReactNode;
  /** One focusable element; it becomes the trigger. */
  children: ReactElement;
  open?: boolean;
  onOpenChange?(open: boolean): void;
};

/** Opens on hover and keyboard focus. Touch callers control `open` (Radix ignores touch). */
export function Tooltip({
  content,
  children,
  open,
  onOpenChange,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root open={open} onOpenChange={onOpenChange}>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side="top"
            sideOffset={6}
            collisionPadding={8}
            className="rounded-ctl bg-ink text-surface shadow-tip data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-pop-in data-[state=instant-open]:animate-pop-in z-50 max-w-[min(280px,calc(100vw-16px))] origin-(--radix-tooltip-content-transform-origin) border border-transparent px-2 py-1.5 text-xs leading-snug font-medium"
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
