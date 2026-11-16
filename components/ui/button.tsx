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

const VARIANT = {
  primary: 'border-transparent bg-accent text-on-accent hover:bg-accent-hover',
  ghost:
    'border-line bg-surface text-ink hover:border-lead-border hover:bg-canvas active:bg-track',
  link: 'border-transparent px-0.5 text-accent underline-offset-3 hover:underline',
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
      type={type}
      aria-busy={pending || undefined}
      aria-disabled={disabledReason !== undefined || undefined}
      title={disabledReason}
      onClick={(event) => {
        if (blocked) event.preventDefault();
        else onClick?.(event);
      }}
      className={cn(
        'rounded-ctl text-13 inline-flex min-h-6 shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-semibold whitespace-nowrap transition-colors duration-150 active:translate-y-px',
        'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
        'aria-busy:cursor-progress',
        VARIANT[variant],
        variant !== 'link' && SIZE[size],
        className,
      )}
      {...rest}
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
