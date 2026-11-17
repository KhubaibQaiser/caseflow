'use client';

import { Suspense, lazy, useTransition } from 'react';

import { PageHeader } from '@/components/shell/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { listFrame } from '@/features/contacts/list/frame';
import { NewContactLink } from '@/features/contacts/list/new-contact-link';
import { ResetOnNavigate } from '@/features/contacts/list/reset-on-navigate';

import { reasonClass, useOffline } from '../error-content';
import type { ReasonClass } from '../error-content';

// Lazy, so the route's first load doesn't carry a second copy of the toolbar for a screen that rarely shows.
const ErrorToolbar = lazy(() =>
  import('@/features/contacts/list/error-toolbar').then((m) => ({
    default: m.ErrorToolbar,
  })),
);

type ListErrorScreenProps = {
  /** "Contacts" or "Pipeline": the heading, the tab title and the error title. */
  title: string;
  /** The `unexpected` reason, which names what failed to show. */
  unexpected: string;
  hideSort?: boolean;
  error: unknown;
  reset: () => void;
  retry: () => void;
};

// The page keeps its header and toolbar (with the applied chips), so the filters visibly survive.
// Never error.message: it can carry server detail.
export function ListErrorScreen({
  title,
  unexpected,
  hideSort,
  error,
  reset,
  retry,
}: ListErrorScreenProps) {
  const offline = useOffline();
  const [retrying, startTransition] = useTransition();
  const reason: Record<ReasonClass, string> = {
    network: 'Check your connection and retry.',
    server: "The server didn't respond.",
    unexpected,
  };
  return (
    <div className="flex flex-col gap-3">
      <title>{`${title} didn't load · Caseflow`}</title>
      <PageHeader title={title} actions={<NewContactLink />} />
      {/* min-h holds the toolbar's row while its code loads. */}
      <div className="md:min-h-8.5">
        <Suspense fallback={null}>
          <ErrorToolbar hideSort={hideSort} />
        </Suspense>
      </div>
      <ResetOnNavigate reset={reset} />
      <div className={listFrame}>
        <ErrorState
          title={`${title} didn't load.`}
          description={`${reason[reasonClass(error, offline)]} Your filters are kept.`}
          // retry() re-fetches the segment's server data, unlike reset() (spec 8.8, Next 16 error.js).
          onRetry={() => startTransition(() => retry())}
          retrying={retrying}
        />
      </div>
    </div>
  );
}
