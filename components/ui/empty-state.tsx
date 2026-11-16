import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react/types';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-13 flex flex-col items-center gap-1.5 px-2 py-5 text-center">
      <Icon aria-hidden className="text-ink-2 size-[22px]" />
      <p className="text-ink m-0 font-semibold">{title}</p>
      {description && <p className="text-ink-2 m-0 mb-1.5">{description}</p>}
      {action}
    </div>
  );
}
