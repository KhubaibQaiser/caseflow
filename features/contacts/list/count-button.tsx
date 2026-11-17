'use client';

import ChevronDown from 'lucide-react/icons/chevron-down';
import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';

const fmt = (n: number) => n.toLocaleString('en-US');

/** The footer's "1–250 of N ▾": the page-size menu's trigger, and its stand-in while the menu code loads. */
export function CountButton({
  from,
  to,
  matching,
  ...rest
}: { from: number; to: number; matching: number } & ComponentProps<'button'>) {
  return (
    <Button {...rest} variant="ghost" className="tnum h-9 px-2">
      {fmt(from)}–{fmt(to)} of {fmt(matching)}
      <span className="sr-only"> rows per page</span>
      <ChevronDown aria-hidden className="size-3.5" />
    </Button>
  );
}
