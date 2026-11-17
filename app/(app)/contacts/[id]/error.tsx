'use client';

import { useTransition } from 'react';

import { ButtonLink } from '@/components/ui/button-link';
import { ErrorState } from '@/components/ui/error-state';

import { reasonClass, useOffline } from '../../../error-content';
import type { ReasonClass } from '../../../error-content';

const REASON: Record<ReasonClass, string> = {
  network: 'Check your connection and retry.',
  server: "The server didn't respond. Retry in a moment.",
  unexpected: 'Something went wrong showing it.',
};

// Never error.message: it can carry server detail.
export default function ContactError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const offline = useOffline();
  const [retrying, startTransition] = useTransition();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <title>Contact didn&apos;t load · Caseflow</title>
      <ErrorState
        page
        title="This contact didn't load."
        description={REASON[reasonClass(error, offline)]}
        // retry() re-fetches the segment's server data; reset() would re-render the stale payload.
        onRetry={() => startTransition(() => retry())}
        retrying={retrying}
        action={
          <ButtonLink href="/contacts" variant="link">
            Back to contacts
          </ButtonLink>
        }
      />
    </div>
  );
}
