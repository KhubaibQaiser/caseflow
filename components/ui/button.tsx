'use client';

import { useId, useState } from 'react';
import type { ComponentProps } from 'react';
import LoaderCircle from 'lucide-react/icons/loader-circle';

import { cn } from '@/utils/cn';

import { Tooltip } from './tooltip';

type ButtonProps = ComponentProps<'button'> & {
  variant: 'primary' | 'ghost' | 'link';
  pending?: boolean;
  pendingLabel?: string;
  disabledReason?: string;
} & (
    | { size?: 'sm' | 'md' }
    // An icon-only button has no visible text, so it must be named.
    | { size: 'icon'; 'aria-label': string }
  );

// Hover and press affordances only on buttons that will act (literal classes so Tailwind sees them).
// Open (aria-expanded) and pressed (aria-pressed) ghosts are `!` so hover can't wash them out,
// and use the system Highlight in forced colours so the state survives there too.
const VARIANT = {
  primary:
    'border-transparent bg-accent text-on-accent enabled:not-aria-disabled:not-aria-busy:hover:bg-accent-hover',
  ghost:
    'border-line bg-surface text-ink enabled:not-aria-disabled:not-aria-busy:hover:border-lead-border enabled:not-aria-disabled:not-aria-busy:hover:bg-canvas enabled:not-aria-disabled:not-aria-busy:active:bg-track aria-expanded:border-accent! aria-expanded:bg-accent-soft! aria-expanded:text-accent! aria-pressed:border-accent! aria-pressed:bg-accent-soft! aria-pressed:text-accent! forced-colors:aria-expanded:bg-[Highlight]! forced-colors:aria-expanded:border-[Highlight]! forced-colors:aria-expanded:text-[HighlightText]! forced-colors:aria-expanded:forced-color-adjust-none forced-colors:aria-pressed:bg-[Highlight]! forced-colors:aria-pressed:border-[Highlight]! forced-colors:aria-pressed:text-[HighlightText]! forced-colors:aria-pressed:forced-color-adjust-none',
  // border-0, not transparent: forced colours would draw a box around a link.
  link: 'border-0 px-0.5 text-accent underline-offset-3 enabled:not-aria-disabled:not-aria-busy:hover:underline',
};

const SIZE = {
  sm: 'h-[30px] px-2.5',
  md: 'h-[34px] px-3.5',
  icon: 'size-[34px] px-0',
};

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
        'group rounded-ctl text-13 inline-flex min-h-6 shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-semibold whitespace-nowrap transition-colors duration-150 enabled:not-aria-disabled:not-aria-busy:active:translate-y-px',
        // aria-disabled dims the content, not the button, so the focus outline and ring keep full strength.
        'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed',
        variant === 'primary' && 'aria-disabled:bg-accent/45',
        'aria-busy:cursor-progress',
        VARIANT[variant],
        variant !== 'link' && SIZE[size],
        className,
      )}
    >
      <span className="inline-flex items-center justify-center gap-1.5 group-aria-disabled:opacity-45">
        {pending && (
          <LoaderCircle
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        )}
        {pending && pendingLabel ? pendingLabel : children}
      </span>
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
