'use client';

import { useEffect } from 'react';

/** Asks the browser to confirm before a reload, tab close or external navigation while `isDirty`. */
export function useUnsavedGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const block = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', block);
    return () => window.removeEventListener('beforeunload', block);
  }, [isDirty]);
}
