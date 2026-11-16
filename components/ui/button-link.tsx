import Link from 'next/link';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

// Navigation styled as a Button. An <a>, so it can't use Button's `enabled:` hover variants.
const VARIANT = {
  // The transparent border becomes the outline in forced colours.
  primary:
    'h-[34px] border border-transparent bg-accent px-3.5 text-on-accent hover:bg-accent-hover',
  ghost:
    'h-[34px] border border-line bg-surface px-3.5 text-ink hover:border-lead-border hover:bg-canvas active:bg-track',
  link: 'px-0.5 text-accent underline-offset-3 hover:underline',
};

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant: keyof typeof VARIANT;
};

export function ButtonLink({ variant, className, ...rest }: ButtonLinkProps) {
  return (
    <Link
      {...rest}
      className={cn(
        'rounded-ctl text-13 inline-flex min-h-6 shrink-0 items-center justify-center font-semibold whitespace-nowrap no-underline transition-colors duration-150 active:translate-y-px',
        VARIANT[variant],
        className,
      )}
    />
  );
}
