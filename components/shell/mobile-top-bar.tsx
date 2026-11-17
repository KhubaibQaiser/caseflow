import { BrandMark } from './brand-mark';
import { ThemeToggle } from './theme-toggle';

/** Below 768px: the mark and the theme button. New contact lives in each page's own header row. */
export function MobileTopBar() {
  return (
    <header className="border-line bg-surface flex h-13 items-center justify-between border-b ps-4 pe-1.5 md:hidden">
      <BrandMark />
      <ThemeToggle />
    </header>
  );
}
