'use client';

import { useQueryStates } from 'nuqs';
import type { Nullable, Options, Values } from 'nuqs';
import {
  createContext,
  createElement,
  use,
  useCallback,
  useTransition,
} from 'react';
import type { ReactNode, TransitionStartFunction } from 'react';

import { listQueryParsers } from '@/lib/contracts/list-query';

type Transition = [boolean, TransitionStartFunction];
const TransitionContext = createContext<Transition | null>(null);

/** One transition for the whole list, so the toolbar spinner and the dimmed rows agree. */
export function ListTransition({ children }: { children: ReactNode }) {
  const transition = useTransition();
  return createElement(TransitionContext, { value: transition }, children);
}

export type ListQueryPatch = Partial<Nullable<Values<typeof listQueryParsers>>>;

/**
 * The list's URL state. Updates re-render the server page inside the shared transition.
 * Any change other than the page itself sends the user back to page 1 (Review Focus 5).
 */
export function useListQuery() {
  const own = useTransition();
  const [isPending, startTransition] = use(TransitionContext) ?? own;
  const [query, set] = useQueryStates(listQueryParsers, {
    shallow: false,
    history: 'push',
    startTransition,
  });
  const setQuery = useCallback(
    (patch: ListQueryPatch, options?: Options) =>
      set('page' in patch ? patch : { ...patch, page: null }, options),
    [set],
  );
  return [query, setQuery, isPending] as const;
}
