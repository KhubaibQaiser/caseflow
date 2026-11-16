'use client';

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

const DESKTOP = '(min-width: 1024px)';

/** Wide enough for the side panel. The server can't know, so it assumes yes and CSS hides the panel on narrow screens. */
export function useIsDesktop() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(DESKTOP);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );
}

export const FILTERS_OPEN_COOKIE = 'filters_open';
const remember = (open: boolean) => {
  document.cookie = `${FILTERS_OPEN_COOKIE}=${open ? 1 : 0}; path=/; max-age=31536000; samesite=lax`;
};

/**
 * Open state for the Filters panel. Desktop remembers it in a cookie (the server renders it as left);
 * the mobile sheet always starts closed. `mounted` turns true on first open so the panel's code loads then.
 */
export function useFiltersPanel(initialOpen: boolean) {
  const desktop = useIsDesktop();
  const [desktopOpen, setDesktopOpen] = useState(initialOpen);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(initialOpen);
  // The server-rendered panel must not steal focus; one opened by the user should take it.
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (desktop) {
        setDesktopOpen(next);
        remember(next);
      } else setSheetOpen(next);
      if (next) {
        setMounted(true);
        setFocusOnOpen(true);
      } else button.current?.focus();
    },
    [desktop],
  );

  return {
    open: desktop ? desktopOpen : sheetOpen,
    setOpen,
    mounted,
    focusOnOpen,
    button,
  };
}
export type FiltersPanelState = ReturnType<typeof useFiltersPanel>;
