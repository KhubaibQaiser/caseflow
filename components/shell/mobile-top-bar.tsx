'use client';

import Plus from 'lucide-react/icons/plus';

import { ButtonLink } from '@/components/ui/button-link';
import { Can } from '@/lib/auth/permissions-context';

import { BrandMark } from './brand-mark';

/** Below 768px. "New" only for roles that can write: a Viewer would land on a forbidden page. */
export function MobileTopBar() {
  return (
    <header className="border-line bg-surface flex h-[52px] items-center justify-between border-b px-4 md:hidden">
      <BrandMark />
      <Can p="contacts.write">
        <ButtonLink
          href="/contacts/new"
          variant="primary"
          className="h-8 gap-1.5 px-2.5"
        >
          <Plus aria-hidden className="size-4" />
          New
        </ButtonLink>
      </Can>
    </header>
  );
}
