import { BrandMark } from './brand-mark';

/** Below 768px: the mark only. New contact lives in each page's own header row. */
export function MobileTopBar() {
  return (
    <header className="border-line bg-surface flex h-13 items-center border-b px-4 md:hidden">
      <BrandMark />
    </header>
  );
}
