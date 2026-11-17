'use client';

import { useEffect } from 'react';

/**
 * While `isDirty`: asks the browser to confirm a reload or tab close, and hands same-origin link clicks
 * to `onLeave(href)` instead of following them. Programmatic router pushes can't be intercepted
 * (and neither can Back); the form's own redirects are exempt by clearing `isDirty` first.
 */
export function useUnsavedGuard(
  isDirty: boolean,
  onLeave: (href: string) => void,
) {
  useEffect(() => {
    if (!isDirty) return;
    const block = (event: BeforeUnloadEvent) => event.preventDefault();
    // Capture phase: runs before Next's Link handler, which would start the navigation.
    const intercept = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (
        !(link instanceof HTMLAnchorElement) ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        (link.target && link.target !== '_self') ||
        link.hasAttribute('download')
      )
        return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return; // beforeunload covers it
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return; // same page, e.g. a summary link to a field
      event.preventDefault();
      event.stopPropagation();
      onLeave(url.pathname + url.search + url.hash);
    };
    window.addEventListener('beforeunload', block);
    document.addEventListener('click', intercept, true);
    return () => {
      window.removeEventListener('beforeunload', block);
      document.removeEventListener('click', intercept, true);
    };
  }, [isDirty, onLeave]);
}
