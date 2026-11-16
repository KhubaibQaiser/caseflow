'use client';

import { ListTransition } from '../url-state';
import { Toolbar } from './toolbar';

/** The toolbar on the error screen: no counts (they didn't load), filters and chips intact. */
export function ErrorToolbar() {
  return (
    <ListTransition>
      <Toolbar isPending={false} />
    </ListTransition>
  );
}
