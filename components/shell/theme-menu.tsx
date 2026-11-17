'use client';

import Monitor from 'lucide-react/icons/monitor';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LazyTooltip } from '@/components/ui/lazy-tooltip';
import { ThemeSchema, themeAttr, themeCookie, type Theme } from '@/lib/theme';

import { ThemeButton } from './theme-button';
import { notify } from './theme-store';

function apply(theme: Theme) {
  document.cookie = themeCookie(theme, location.protocol === 'https:');
  const attr = themeAttr(theme);
  if (attr) document.documentElement.dataset.theme = attr;
  else delete document.documentElement.dataset.theme;
  notify();
}

/** Radix menu + floating-ui: loaded lazily by ThemeToggle, so it stays out of every page's first load. */
export default function ThemeMenu({
  theme,
  label,
  className,
}: {
  theme: Theme;
  label: string;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <LazyTooltip content={label}>
        <DropdownMenuTrigger asChild>
          <ThemeButton label={label} className={className} />
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
