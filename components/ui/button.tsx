'use client';

import { useId, useState } from 'react';
import type { ComponentProps } from 'react';
import LoaderCircle from 'lucide-react/icons/loader-circle';

import { cn } from '@/utils/cn';

import { Tooltip } from './tooltip';

type ButtonProps = ComponentProps<'button'> & {
  variant: 'primary' | 'ghost' | 'link';
  size?: 'sm' | 'md';
  pending?: boolean;
  pendingLabel?: string;
  disabledReason?: string;
};

// Hover and press affordances only on buttons that will act (literal classes so Tailwind sees them).
const VARIANT = {
  primary:
    'border-transparent bg-accent text-on-accent enabled:not-aria-disabled:not-aria-busy:hover:bg-accent-hover',
  ghost:
    'border-line bg-surface text-ink enabled:not-aria-disabled:not-aria-busy:hover:border-lead-border enabled:not-aria-disabled:not-aria-busy:hover:bg-canvas enabled:not-aria-disabled:not-aria-busy:active:bg-track',
  link: 'border-transparent px-0.5 text-accent underline-offset-3 enabled:not-aria-disabled:not-aria-busy:hover:underline',
};

const SIZE = { sm: 'h-[30px] px-2.5', md: 'h-[34px] px-3.5' };

export function Button({
  variant,
  size = 'md',
  pending = false,
  pendingLabel,
  disabledReason,
  onClick,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const reasonId = useId();
  const [reasonOpen, setReasonOpen] = useState(false);
  // aria-disabled (not disabled) keeps the button focusable so the reason can be read.
  const blocked = pending || disabledReason !== undefined;
  // The open tooltip describes the button itself; the hidden copy covers it while closed.
  const describedBy = [
    disabledReason !== undefined && !reasonOpen && reasonId,
    rest['aria-describedby'],
  ]
    .filter(Boolean)
    .join(' ');
  const button = (
    <button
      {...rest}
      type={type}
      aria-busy={pending || undefined}
      aria-disabled={disabledReason !== undefined || rest['aria-disabled']}
      // The tooltip carries the reason; a native title on top would show it twice.
      title={disabledReason === undefined ? rest.title : undefined}
      aria-describedby={describedBy || undefined}
      onClick={(event) => {
        // preventDefault also stops the tooltip closing itself on click, so a tap shows the reason.
        if (blocked) event.preventDefault();
        else onClick?.(event);
        if (disabledReason !== undefined) setReasonOpen(true);
      }}
      className={cn(
        'rounded-ctl text-13 inline-flex min-h-6 shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-semibold whitespace-nowrap transition-colors duration-150 enabled:not-aria-disabled:not-aria-busy:active:translate-y-px',
        'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
        'aria-busy:cursor-progress',
        VARIANT[variant],
        variant !== 'link' && SIZE[size],
        className,
      )}
    >
      {pending && (
        <LoaderCircle
          aria-hidden
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      )}
      {pending && pendingLabel ? pendingLabel : children}
      {disabledReason !== undefined && (
        <span id={reasonId} hidden>
          {disabledReason}
        </span>
      )}
    </button>
  );
  if (disabledReason === undefined) return button;
  return (
    <Tooltip
      content={disabledReason}
      open={reasonOpen}
      onOpenChange={setReasonOpen}
    >
      {button}
    </Tooltip>
  );
}
