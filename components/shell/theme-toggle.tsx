'use client';

import Monitor from 'lucide-react/icons/monitor';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import { useSyncExternalStore } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LazyTooltip } from '@/components/ui/lazy-tooltip';
import {
  ThemeSchema,
  parseTheme,
  themeAttr,
  themeCookie,
  themeLabel,
  type Theme,
} from '@/lib/theme';
import { cn } from '@/utils/cn';

// The html attribute is the source of truth, so every mounted toggle (top bar and page header) agrees.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const readTheme = (): Theme =>
  parseTheme(document.documentElement.dataset.theme);

const DARK_MQ = '(prefers-color-scheme: dark)';
const subscribeDark = (cb: () => void) => {
  const mq = matchMedia(DARK_MQ);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

function apply(theme: Theme) {
  document.cookie = themeCookie(theme, location.protocol === 'https:');
  const attr = themeAttr(theme);
  if (attr) document.documentElement.dataset.theme = attr;
  else delete document.documentElement.dataset.theme;
  listeners.forEach((l) => l());
}

/** Icon button + menu. The server renders "System" and the browser refines it after hydration. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    readTheme,
    () => 'system',
  );
  const systemDark = useSyncExternalStore<boolean | null>(
    subscribeDark,
    () => matchMedia(DARK_MQ).matches,
    () => null,
  );
  const label = themeLabel(theme, systemDark);
  return (
    <DropdownMenu>
      <LazyTooltip content={label}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(
              'text-ink-2 hover:bg-track hover:text-ink rounded-ctl data-[state=open]:bg-track grid size-10 shrink-0 cursor-pointer place-items-center md:size-8.5',
              className,
            )}
          >
            <Sun aria-hidden className="theme-sun size-4.5" />
            <Moon aria-hidden className="theme-moon size-4.5" />
          </button>
        </DropdownMenuTrigger>
      </LazyTooltip>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => {
            const r = ThemeSchema.safeParse(v);
            if (r.success) apply(r.data);
          }}
        >
          <DropdownMenuRadioItem value="system" className="max-md:min-h-11">
            <Monitor aria-hidden className="text-ink-2 size-3.5" />
            System
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light" className="max-md:min-h-11">
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="max-md:min-h-11">
            Dark
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
