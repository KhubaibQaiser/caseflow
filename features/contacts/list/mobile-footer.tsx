'use client';

import ChevronLeft from 'lucide-react/icons/chevron-left';
import ChevronRight from 'lucide-react/icons/chevron-right';
import { Suspense, lazy } from 'react';

import { footerBar } from '@/components/shell/footer-bar';
import { cn } from '@/utils/cn';

import { CountButton } from './count-button';
import { usePageLink } from './pagination';

const PageSizeMenu = lazy(() =>
  import('./page-size-menu').then((m) => ({ default: m.PageSizeMenu })),
);

const arrow =
  'text-ink hover:bg-track rounded-ctl grid size-9 place-items-center no-underline';

/** Below 768px, in place of the pager row: the count opens the page-size menu, then ‹ Page x / y ›. */
export function MobileFooter({
  page,
  pageSize,
  matching,
}: {
  page: number;
  pageSize: number;
  matching: number;
}) {
  const link = usePageLink();
  const last = Math.max(1, Math.ceil(matching / pageSize));
  const from = Math.min((page - 1) * pageSize + 1, matching);
  const to = Math.min(page * pageSize, matching);
  const step = (target: number, label: string, Icon: typeof ChevronLeft) =>
    target < 1 || target > last ? (
      <span
        role="link"
        aria-disabled="true"
        aria-label={label}
        className={cn(arrow, 'text-ink-2 cursor-not-allowed opacity-45')}
      >
        <Icon aria-hidden className="size-4" />
      </span>
    ) : (
      <a {...link(target)} aria-label={label} className={arrow}>
        <Icon aria-hidden className="size-4" />
      </a>
    );
  return (
    <div
      className={cn(
        footerBar,
        'text-13 text-ink-2 tnum justify-between md:hidden',
      )}
    >
      <Suspense
        fallback={<CountButton from={from} to={to} matching={matching} />}
      >
        <PageSizeMenu from={from} to={to} matching={matching} />
      </Suspense>
      {last > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          {step(page - 1, 'Previous page', ChevronLeft)}
          <span aria-current="page">
            Page {page} / {last}
          </span>
          {step(page + 1, 'Next page', ChevronRight)}
        </nav>
      )}
    </div>
  );
}
