'use client';

import Inbox from 'lucide-react/icons/inbox';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { ContactRow } from '@/lib/contracts/contact';
import { STATUS_LABEL } from '@/lib/contracts/enums';
import type { Status } from '@/lib/contracts/enums';
import type { Result } from '@/lib/contracts/result';
import { cn } from '@/utils/cn';

import { PipelineCard } from './pipeline-card';
import { PAGE_SIZE } from './rows';
import type { PipelineRow } from './rows';

type ColumnProps = {
  status: Status;
  rows: PipelineRow[];
  matching: number;
  /** No page left to ask for. */
  exhausted?: boolean;
  onMove(id: string, to: Status): Promise<Result<ContactRow>>;
  /** Resolves true once the next rows are in, false when the request failed. */
  onLoadMore(): Promise<boolean>;
  disabledReason?: string;
  className?: string;
};

const fmt = (n: number) => n.toLocaleString('en-US');

export function Column({
  status,
  rows,
  matching,
  exhausted = false,
  onMove,
  onLoadMore,
  disabledReason,
  className,
}: ColumnProps) {
  const label = STATUS_LABEL[status];
  const list = useRef<HTMLUListElement>(null);
  const inflight = useRef(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [announce, setAnnounce] = useState('');
  // Where the new rows start, so focus can follow the button that just turned into them.
  const focusFrom = useRef<number | null>(null);
  const left = Math.max(0, matching - rows.length);

  useEffect(() => {
    const from = focusFrom.current;
    if (from === null || rows.length <= from) return;
    focusFrom.current = null;
    list.current
      ?.querySelectorAll<HTMLElement>('[data-card-link]')
      [from]?.focus();
  }, [rows.length]);

  async function loadMore() {
    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);
    setFailed(false);
    setAnnounce('');
    const before = rows.length;
    focusFrom.current = before;
    const loaded = await onLoadMore().catch(() => false);
    inflight.current = false;
    setLoading(false);
    if (loaded) setAnnounce(`More ${label} contacts loaded.`);
    else {
      focusFrom.current = null;
      setFailed(true);
    }
  }

  return (
    <section
      aria-labelledby={`column-${status}`}
      className={cn(
        'bg-track rounded-surface flex min-h-0 flex-col gap-2 p-2.5 md:overflow-hidden',
        className,
      )}
    >
      <header className="px-1 py-0.5">
        <h2
          id={`column-${status}`}
          className="text-ink text-13 m-0 flex items-baseline gap-2 font-semibold"
        >
          {label}{' '}
          <span className="text-ink-2 tnum font-normal">
            {fmt(matching)}
            <span className="sr-only"> contacts</span>
          </span>
        </h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 md:overflow-y-auto">
        {rows.length === 0 ? (
          <EmptyState icon={Inbox} title={`No ${label} contacts.`} />
        ) : (
          <ul
            ref={list}
            aria-label={`${label} contacts`}
            className="tnum m-0 flex list-none flex-col gap-2 p-0"
          >
            {rows.map((r) => (
              <PipelineCard
                key={r.id}
                row={r}
                onMove={onMove}
                disabledReason={disabledReason}
              />
            ))}
          </ul>
        )}
        {failed && (
          <p
            role="alert"
            className="text-overdue text-13 m-0 px-1 text-center font-medium"
          >
            Couldn&apos;t load more.
          </p>
        )}
        {left > 0 && !exhausted && (
          <Button
            variant="ghost"
            pending={loading}
            pendingLabel="Loading…"
            onClick={() => void loadMore()}
            className="border-lead-border text-ink-2 tnum mt-auto h-8 shrink-0 border-dashed bg-transparent"
          >
            {failed ? 'Retry' : `Show ${Math.min(PAGE_SIZE, left)} more`} ·{' '}
            {fmt(left)} left
          </Button>
        )}
      </div>
      <p role="status" className="sr-only">
        {announce}
      </p>
    </section>
  );
}
