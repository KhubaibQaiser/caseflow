'use client';

import CircleAlert from 'lucide-react/icons/circle-alert';

import { Button } from './button';

type ErrorStateProps = {
  title: string;
  description: string;
  onRetry?(): void;
};

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="text-13 flex flex-col items-center gap-1.5 px-2 py-5 text-center"
    >
      <CircleAlert aria-hidden className="text-ink-2 size-[22px]" />
      <p className="text-ink m-0 font-semibold">{title}</p>
      <p className="text-ink-2 m-0 mb-1.5">{description}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
