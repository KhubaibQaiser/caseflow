'use client';

import { useTransition } from 'react';

import { ErrorState } from '@/components/ui/error-state';

import { reasonClass, useOffline } from '../../error-content';
import type { ReasonClass } from '../../error-content';

const REASON: Record<ReasonClass, string> = {
  network: 'Check your connection and retry.',
  server: "The server didn't respond.",
  unexpected: 'Something went wrong showing them.',
};

// Never error.message: it can carry server detail.
export default function ContactsError({
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
      <title>Contacts didn&apos;t load · Caseflow</title>
      <ErrorState
        page
        title="Contacts didn't load."
        // The URL holds every filter, so a retry comes back to the same list.
        description={`${REASON[reasonClass(error, offline)]} Your filters are kept.`}
        // retry() re-fetches the segment's server data, unlike reset() (spec 8.8, Next 16 error.js).
        onRetry={() => startTransition(() => retry())}
        retrying={retrying}
      />
    </div>
  );
}
