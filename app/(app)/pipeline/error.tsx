'use client';

import { Suspense, lazy, useTransition } from 'react';

import { PageHeader } from '@/components/shell/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { NewContactLink } from '@/features/contacts/list/new-contact-link';
import { listFrame } from '@/features/contacts/list/frame';
import { ResetOnNavigate } from '@/features/contacts/list/reset-on-navigate';

import { reasonClass, useOffline } from '../../error-content';
import type { ReasonClass } from '../../error-content';

// Lazy, like the list's: the board rarely lands here, so its first load shouldn't carry a toolbar for it.
const ErrorToolbar = lazy(() =>
  import('@/features/contacts/list/error-toolbar').then((m) => ({
    default: m.ErrorToolbar,
  })),
);

const REASON: Record<ReasonClass, string> = {
  network: 'Check your connection and retry.',
  server: "The server didn't respond.",
  unexpected: 'Something went wrong showing it.',
};

// Same pattern as the list: the header and toolbar stay, so the filters visibly survive.
// Never error.message: it can carry server detail.
export default function PipelineError({
  error,
  reset,
  retry,
}: {
  error: unknown;
  reset: () => void;
  retry: () => void;
}) {
  const offline = useOffline();
  const [retrying, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <title>Pipeline didn&apos;t load · Caseflow</title>
      <PageHeader title="Pipeline" actions={<NewContactLink />} />
      <div className="md:min-h-[34px]">
        <Suspense fallback={null}>
          <ErrorToolbar hideSort />
        </Suspense>
      </div>
      <ResetOnNavigate reset={reset} />
      <div className={listFrame}>
        <ErrorState
          title="Pipeline didn't load."
          description={`${REASON[reasonClass(error, offline)]} Your filters are kept.`}
          onRetry={() => startTransition(() => retry())}
          retrying={retrying}
        />
      </div>
    </div>
  );
}
