'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LazyTooltip } from '@/components/ui/lazy-tooltip';

import { AccountBlock } from './account-block';
import type { SignOut } from './account-block';
import { BrandMark } from './brand-mark';
import { NAV, isCurrent } from './nav';

/** Desktop: 196px with labels. Tablet (768-1023): an icon rail with tooltips. Hidden on mobile. */
export function Sidebar({ signOut }: { signOut: SignOut }) {
  const pathname = usePathname();
  return (
    <aside
      aria-label="Sidebar"
      className="border-line bg-surface sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r px-2 py-3.5 md:flex lg:w-49 lg:px-2.5"
    >
      <div className="px-2.5 pt-1 pb-4.5 max-lg:flex max-lg:justify-center max-lg:px-0">
        <BrandMark labelClassName="max-lg:sr-only" />
      </div>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => (
          <LazyTooltip
            key={href}
            content={label}
            side="right"
            contentClassName="lg:hidden"
          >
            <Link
              href={href}
              aria-current={isCurrent(pathname, href) ? 'page' : undefined}
              className="rounded-ctl text-ink-2 hover:bg-canvas hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent flex h-8.5 items-center gap-2.5 px-2.5 text-sm font-medium no-underline transition-colors duration-150 aria-[current=page]:font-semibold max-lg:justify-center max-lg:px-0"
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              <span className="max-lg:sr-only">{label}</span>
            </Link>
          </LazyTooltip>
        ))}
      </nav>
      <AccountBlock signOut={signOut} />
    </aside>
  );
}
