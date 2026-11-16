'use client';

import { useRouter } from 'next/navigation';
import { useSyncExternalStore, useTransition } from 'react';

import { ButtonLink } from '@/components/ui/button-link';
import { ErrorState } from '@/components/ui/error-state';

// Chrome, Firefox and Safari wordings of a fetch that never reached the server.
const NETWORK = /failed to fetch|networkerror|load failed/i;

// Offline is only known in the browser; the server snapshot says online so hydration matches.
function subscribe(notify: () => void) {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
}

function reasonFor(error: unknown, offline: boolean) {
  if (
    offline ||
    (error instanceof Error &&
      (error.name === 'ChunkLoadError' || NETWORK.test(error.message)))
  )
    return 'Network error. Check your connection, then retry.';
  if (digestOf(error)) return 'Server error. Retry in a moment.';
  return 'Unexpected error. Retry, or start again from contacts.';
}

// Server Component errors arrive with a digest that matches the server log.
function digestOf(error: unknown) {
  return error instanceof Error &&
    'digest' in error &&
    typeof error.digest === 'string'
    ? error.digest
    : undefined;
}

// Shows the reason class and digest only: never error.message or a stack.
export function ErrorContent({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  const digest = digestOf(error);
  const offline = useSyncExternalStore(
    subscribe,
    () => !navigator.onLine,
    () => false,
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <title>Something broke · Caseflow</title>
      <meta name="robots" content="noindex" />
      <ErrorState
        page
        title="Something broke on our side."
        description={
          <>
            {reasonFor(error, offline)}
            {digest && (
              <span className="mt-1 block">
                Reference{' '}
                <span className="text-ink tnum font-medium select-all">
                  {digest}
                </span>
              </span>
            )}
          </>
        }
        // reset() alone re-renders stale server data; refresh refetches it first (spec 8.8).
        onRetry={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
        retrying={retrying}
        action={
          <ButtonLink href="/contacts" variant="link">
            Go to contacts
          </ButtonLink>
        }
      />
    </div>
  );
}
