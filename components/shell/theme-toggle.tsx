'use client';

import { Suspense, lazy, useState, useSyncExternalStore } from 'react';

import { themeLabel, type Theme } from '@/lib/theme-label';

import { ThemeButton } from './theme-button';
import { readDark, readTheme, subscribe, subscribeDark } from './theme-store';

/** Starts loading the menu code; the stand-in calls it on hover and focus. */
export const preloadThemeMenu = () => import('./theme-menu');
const ThemeMenu = lazy(preloadThemeMenu);

/** Icon button + menu. The server renders "System" and the browser refines it after hydration. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    readTheme,
    () => 'system',
  );
  const systemDark = useSyncExternalStore<boolean | null>(
    subscribeDark,
    readDark,
    () => null,
  );
  // A click on the stand-in, before the menu code arrives, opens the menu as soon as it mounts.
  const [wantOpen, setWantOpen] = useState(false);
  const label = themeLabel(theme, systemDark);
  return (
    <Suspense
      fallback={
        <ThemeButton
          label={label}
          className={className}
          onPointerEnter={() => void preloadThemeMenu()}
          onFocus={() => void preloadThemeMenu()}
          onClick={() => setWantOpen(true)}
        />
      }
    >
      <ThemeMenu
        theme={theme}
        label={label}
        className={className}
        defaultOpen={wantOpen}
      />
    </Suspense>
  );
}
