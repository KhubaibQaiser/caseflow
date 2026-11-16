'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const cookieZone = () =>
  document.cookie
    .split('; ')
    .find((c) => c.startsWith('tz='))
    ?.slice(3);

/** Keeps the `tz` cookie (read by server components for "today") equal to the browser's zone. */
export function TimezoneSync() {
  const router = useRouter();
  useEffect(() => {
    // Returning to a tab fires visibilitychange and focus together; one refresh covers both.
    let last = -Infinity;
    const refresh = () => {
      if (Date.now() - last < 1000) return;
      last = Date.now();
      router.refresh();
    };
    // Returns true when it changed the zone and refreshed.
    const sync = () => {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (cookieZone() === encodeURIComponent(zone)) return false;
      document.cookie = `tz=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
      refresh();
      return true;
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    // Focus also refreshes, so "Overdue" and "Due today" labels move on after midnight.
    const onFocus = () => {
      if (!sync()) refresh();
    };
    sync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [router]);
  return null;
}
