import Monitor from 'lucide-react/icons/monitor';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

/** The theme trigger, and its stand-in while the menu code loads. All three glyphs are in the markup; the html attribute picks one in CSS. */
export function ThemeButton({
  label,
  className,
  ...rest
}: { label: string } & Omit<ComponentProps<'button'>, 'aria-label'>) {
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      className={cn(
        'text-ink-2 hover:bg-track hover:text-ink rounded-ctl data-[state=open]:bg-track grid size-10 shrink-0 cursor-pointer place-items-center md:size-8.5',
        className,
      )}
    >
      <Monitor aria-hidden className="theme-system size-4.5" />
      <Sun aria-hidden className="theme-sun size-4.5" />
      <Moon aria-hidden className="theme-moon size-4.5" />
    </button>
  );
}
