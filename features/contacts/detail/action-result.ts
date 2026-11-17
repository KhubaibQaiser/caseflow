'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { toast } from '@/components/ui/toaster';
import { fail, type Result } from '@/lib/contracts/result';

type Failure = Extract<Result<never>, { ok: false }>['error'];

/** A Server Action that never reached the server rejects; treat it as a failed save, not a crash. */
export async function attempt<T>(
  run: () => Promise<Result<T>>,
  what: string,
): Promise<Result<T>> {
  try {
    return await run();
  } catch {
    return fail('server', `Couldn't ${what}. Check your connection and retry.`);
  }
}

export function useSessionExpired() {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    () =>
      router.push(`/login?reason=expired&next=${encodeURIComponent(pathname)}`),
    [router, pathname],
  );
}

/** Toasts a failed write; an expired session goes to sign-in instead. `noun` finishes "You don't have permission to ...". */
export function useReportFailure() {
  const expired = useSessionExpired();
  return useCallback(
    (error: Failure, noun: string, retry: () => void) => {
      if (error.code === 'unauthorized') expired();
      else if (error.code === 'forbidden')
        toast.error(`You don't have permission to ${noun}.`);
      else if (error.code === 'not_found')
        toast.error("This contact doesn't exist any more.");
      else
        toast.error(error.message, {
          action: { label: 'Retry', onClick: retry },
        });
    },
    [expired],
  );
}
