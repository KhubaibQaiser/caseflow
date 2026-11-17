'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Next only resets an error boundary on a new pathname. When the committed URL moves to a new list
// (not the typed, still-debounced one), the navigation has already fetched it: reset() just shows it.
export function ResetOnNavigate({ reset }: { reset: () => void }) {
  const url = useSearchParams()?.toString() ?? '';
  const last = useRef(url);
  useEffect(() => {
    if (url === last.current) return;
    last.current = url;
    reset();
  }, [url, reset]);
  return null;
}
