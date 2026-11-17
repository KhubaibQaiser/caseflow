'use client';

import SearchX from 'lucide-react/icons/search-x';
import UsersRound from 'lucide-react/icons/users-round';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Can } from '@/lib/auth/permissions-context';

import { useListQuery } from '../url-state';
import { CLEAR_ALL, activeFilters } from './active-filters';
import { listFrame } from './frame';
import { NewContactLink } from './new-contact-link';
import { SEARCH_ID } from './toolbar';

export { NewContactLink };

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
