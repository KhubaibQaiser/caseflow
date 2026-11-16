'use client';

import type { ComponentProps } from 'react';
import LoaderCircle from 'lucide-react/icons/loader-circle';

import { cn } from '@/utils/cn';

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
  // aria-disabled (not disabled) keeps the button focusable so the reason can be read.
  const blocked = pending || disabledReason !== undefined;
  return (
    <button
      {...rest}
      type={type}
      aria-busy={pending || undefined}
      aria-disabled={disabledReason !== undefined || undefined}
      title={disabledReason}
      onClick={(event) => {
        if (blocked) event.preventDefault();
        else onClick?.(event);
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
    </button>
  );
}
