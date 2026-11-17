'use client';

import Plus from 'lucide-react/icons/plus';

import { ButtonLink } from '@/components/ui/button-link';
import { Can } from '@/lib/auth/permissions-context';
import { cn } from '@/utils/cn';

// Its own module, so the error screen can show it without pulling in the toolbar.
/** Hidden for roles that can't write: it would only lead to the forbidden page (spec 8.10). */
export function NewContactLink({
  className,
  variant = 'primary',
}: {
  className?: string;
  variant?: 'primary' | 'ghost';
}) {
  return (
    <Can p="contacts.write">
      <ButtonLink
        href="/contacts/new"
        variant={variant}
        className={cn('gap-1.5', className)}
      >
        <Plus aria-hidden className="size-4" />
        New contact
      </ButtonLink>
    </Can>
  );
}
