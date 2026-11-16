import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react/types';

import { cn } from '@/utils/cn';

import { PageHeading } from './page-heading';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** The whole page is this state: the title becomes the focused h1. */
  page?: boolean;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  page = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-2 py-5 text-center',
        page ? 'gap-2 text-sm' : 'text-13 gap-1.5',
      )}
    >
      <Icon
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
      {description && (
        <p className={cn('text-ink-2 m-0 mb-1.5', page && 'mb-3 max-w-[46ch]')}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
