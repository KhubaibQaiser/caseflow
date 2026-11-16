'use client';

import Plus from 'lucide-react/icons/plus';
import SearchX from 'lucide-react/icons/search-x';
import UsersRound from 'lucide-react/icons/users-round';

import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { EmptyState } from '@/components/ui/empty-state';
import { Can } from '@/lib/auth/permissions-context';
import { cn } from '@/utils/cn';

import { useListQuery } from '../url-state';
import { CLEAR_ALL, activeFilters } from './active-filters';
import { listFrame } from './frame';
import { SEARCH_ID } from './toolbar';

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

export function FirstRun() {
  return (
    <div className={listFrame}>
      <Can
        p="contacts.write"
        fallback={
          <EmptyState
            icon={UsersRound}
            title="No contacts yet. An admin can add them."
          />
        }
      >
        <EmptyState
          icon={UsersRound}
          title="No contacts yet."
          // The header already has the primary New contact; one primary per screen.
          action={<NewContactLink variant="ghost" />}
        />
      </Can>
    </div>
  );
}

export function Filtered() {
  const [query, setQuery] = useListQuery();
  const text = query.q?.trim();
  const applied = [
    ...(text ? [`Search: “${text}”`] : []),
    ...activeFilters(query).map((f) => `${f.label}: ${f.value}`),
  ].join(' · ');
  return (
    <div className={listFrame}>
      <EmptyState
        icon={SearchX}
        title="No contacts match these filters."
        description={applied}
        action={
          <Button
            variant="ghost"
            onClick={() => {
              setQuery(CLEAR_ALL);
              // The button goes with the empty state; search is where the next try starts.
              document.getElementById(SEARCH_ID)?.focus();
            }}
          >
            Clear filters
          </Button>
        }
      />
    </div>
  );
}
