'use client';

import { useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

import { useHeadroom } from './use-headroom';

/**
 * Below md: the page's subheader, stuck under the top bar. It slides up out of view on scroll down and back on
 * scroll up, over the content (transform only, so nothing reflows). With `pin`, `children` stay in view and
 * only `title` leaves. md+: an ordinary block.
 * -mt-2/pt-2 and -mb-2/pb-2 give the stuck bar room without moving anything.
 */
export function Headroom({
  title,
  children,
  pin = false,
}: {
  title: ReactNode;
  children?: ReactNode;
  pin?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const measure = useCallback(
    (el: HTMLElement) => {
      const pinned = pin ? el.children[1] : null;
      return pinned instanceof HTMLElement
        ? pinned.offsetTop - parseFloat(getComputedStyle(el).paddingTop)
        : el.offsetHeight;
    },
    [pin],
  );
  const { hidden, floating, animated } = useHeadroom(root, measure);
  // Pinned children stay reachable; only the title row is taken out of the tab order.
  const off = hidden ? ({ inert: true, 'aria-hidden': true } as const) : {};
  return (
    <div
      ref={root}
      data-headroom
      {...(pin ? {} : off)}
      className={cn(
        'flex flex-col gap-3 md:contents',
        'max-md:bg-canvas max-md:sticky max-md:top-13 max-md:z-20 max-md:-mx-4 max-md:-mt-2 max-md:-mb-2 max-md:px-4 max-md:pt-2 max-md:pb-2',
        animated &&
          'max-md:transition-[transform,box-shadow] max-md:duration-200 max-md:ease-out',
        hidden && 'max-md:[transform:translateY(calc(var(--reveal)*-1))]',
        floating && !hidden && 'max-md:shadow-raised',
      )}
    >
      <div {...(pin ? off : {})} className="md:contents">
        {title}
      </div>
      {children}
    </div>
  );
}
