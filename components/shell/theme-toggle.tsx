'use client';

import { Suspense, lazy, useSyncExternalStore } from 'react';

import { themeLabel, type Theme } from '@/lib/theme-label';

import { ThemeButton } from './theme-button';
import { readDark, readTheme, subscribe, subscribeDark } from './theme-store';

const ThemeMenu = lazy(() => import('./theme-menu'));

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
  const label = themeLabel(theme, systemDark);
  return (
    <Suspense fallback={<ThemeButton label={label} className={className} />}>
      <ThemeMenu theme={theme} label={label} className={className} />
    </Suspense>
  );
}
