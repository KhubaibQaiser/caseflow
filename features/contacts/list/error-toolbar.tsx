'use client';

import { useRef } from 'react';

import { ListTransition } from '../url-state';
import { Toolbar } from './toolbar';

/** The toolbar on the error screen: no counts (they didn't load), chips intact, Filters waits for the list. */
export function ErrorToolbar({ hideSort }: { hideSort?: boolean }) {
  const filtersButton = useRef<HTMLButtonElement>(null);
  return (
    <ListTransition>
      <Toolbar filtersButton={filtersButton} hideSort={hideSort} />
    </ListTransition>
  );
}
