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
    // Returns true when it changed the zone and refreshed.
    const sync = () => {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (cookieZone() === encodeURIComponent(zone)) return false;
      document.cookie = `tz=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
      return true;
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    // Focus also refreshes, so "Overdue" and "Due today" labels move on after midnight.
    const onFocus = () => {
      if (!sync()) router.refresh();
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
