'use client';

import type { ReactNode } from 'react';
import CircleAlert from 'lucide-react/icons/circle-alert';

import { cn } from '@/utils/cn';

import { Button } from './button';
import { PageHeading } from './page-heading';

type ErrorStateProps = {
  title: string;
  description: ReactNode;
  onRetry?(): void;
  retrying?: boolean;
  /** Sits beside Retry. */
  action?: ReactNode;
  /** The whole page is this state: the title becomes the focused h1. */
  page?: boolean;
};

export function ErrorState({
  title,
  description,
  onRetry,
  retrying = false,
  action,
  page = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center px-2 py-5 text-center',
        page ? 'gap-2 text-sm' : 'text-13 gap-1.5',
      )}
    >
      <CircleAlert
        aria-hidden
        className={cn('text-ink-2', page ? 'size-[26px]' : 'size-[22px]')}
      />
      {page ? (
        <PageHeading className="text-ink m-0 text-xl font-semibold text-balance">
          {title}
        </PageHeading>
      ) : (
        <p className="text-ink m-0 font-semibold">{title}</p>
      )}
      <p className={cn('text-ink-2 m-0 mb-1.5', page && 'mb-3 max-w-[46ch]')}>
        {description}
      </p>
      {(onRetry || action) && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {onRetry && (
            <Button
              variant="primary"
              pending={retrying}
              pendingLabel="Retrying…"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
