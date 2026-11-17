'use client';

import { Suspense, lazy, useTransition } from 'react';

import { PageHeader } from '@/components/shell/page-header';
import { ErrorState } from '@/components/ui/error-state';
import { NewContactLink } from '@/features/contacts/list/new-contact-link';
import { listFrame } from '@/features/contacts/list/frame';
import { ResetOnNavigate } from '@/features/contacts/list/reset-on-navigate';

import { reasonClass, useOffline } from '../../../error-content';
import type { ReasonClass } from '../../../error-content';

// Lazy, so the route's first load doesn't carry a second copy of the toolbar for a screen that rarely shows.
const ErrorToolbar = lazy(() =>
  import('@/features/contacts/list/error-toolbar').then((m) => ({
    default: m.ErrorToolbar,
  })),
);

const REASON: Record<ReasonClass, string> = {
  network: 'Check your connection and retry.',
  server: "The server didn't respond.",
  unexpected: 'Something went wrong showing them.',
};

// The page keeps its header and toolbar (with the applied chips), so the filters visibly survive.
// Never error.message: it can carry server detail.
export default function ContactsError({
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
      <title>Contacts didn&apos;t load · Caseflow</title>
      <PageHeader
        title="Contacts"
        actions={<NewContactLink className="max-md:hidden" />}
      />
      {/* min-h holds the toolbar's row while its code loads. */}
      <div className="md:min-h-[34px]">
        <Suspense fallback={null}>
          <ErrorToolbar />
        </Suspense>
      </div>
      <ResetOnNavigate reset={reset} />
      <div className={listFrame}>
        <ErrorState
          title="Contacts didn't load."
          description={`${REASON[reasonClass(error, offline)]} Your filters are kept.`}
          // retry() re-fetches the segment's server data, unlike reset() (spec 8.8, Next 16 error.js).
          onRetry={() => startTransition(() => retry())}
          retrying={retrying}
        />
      </div>
    </div>
  );
}
