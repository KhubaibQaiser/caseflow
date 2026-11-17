'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import CircleAlert from 'lucide-react/icons/circle-alert';
import TriangleAlert from 'lucide-react/icons/triangle-alert';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

// Takes focus when it appears, so its buttons are the next Tab stop and the alert is announced.
function Banner({
  tone,
  title,
  detail,
  children,
}: {
  tone: 'conflict' | 'failed';
  title: string;
  detail?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const Icon = tone === 'conflict' ? TriangleAlert : CircleAlert;
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className={cn(
        'rounded-ctl text-13 flex flex-wrap items-center gap-x-3 gap-y-2.5 px-3 py-2.5',
        tone === 'conflict'
          ? 'bg-today-bg text-today'
          : 'bg-overdue-bg text-overdue',
      )}
    >
      <div className="flex min-w-48 flex-1 items-start gap-3">
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="m-0 font-semibold">{title}</p>
          {detail && <p className="m-0 mt-0.5">{detail}</p>}
        </div>
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function ConflictBanner({
  busy,
  onReload,
}: {
  /** The newer copy is still loading. */
  busy: boolean;
  onReload(): void;
}) {
  return (
    <Banner
      tone="conflict"
      title="This contact was changed since you opened it."
      detail="Reload latest to see the newer version. Your unsaved edits are replaced, so re-apply them after."
    >
      <Button variant="ghost" size="sm" onClick={onReload} disabled={busy}>
        Reload latest
      </Button>
    </Banner>
  );
}

export function SaveFailedBanner({
  message,
  onRetry,
}: {
  /** Set when retrying can't help (no permission, contact deleted). */
  message?: string;
  onRetry?(): void;
}) {
  return (
    <Banner
      tone="failed"
      title={message ?? 'Save failed. Your changes are still here.'}
    >
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Banner>
  );
}
