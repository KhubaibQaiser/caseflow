'use client';

import { useCallback, useState } from 'react';

import type { ListQuery } from '@/lib/contracts/list-query';

/** The URL keys the panel edits (the chips and the toolbar own q, sort and paging). */
export type FilterDraft = Pick<
  ListQuery,
  | 'status'
  | 'matter'
  | 'source'
  | 'fu'
  | 'fuFrom'
  | 'fuTo'
  | 'createdFrom'
  | 'createdTo'
>;

export const EMPTY_DRAFT: FilterDraft = {
  status: null,
  matter: null,
  source: null,
  fu: null,
  fuFrom: null,
  fuTo: null,
  createdFrom: null,
  createdTo: null,
};

const KEYS = Object.keys(EMPTY_DRAFT) as (keyof FilterDraft)[];

export const pickDraft = (q: FilterDraft): FilterDraft => ({
  ...EMPTY_DRAFT,
  ...Object.fromEntries(KEYS.map((k) => [k, q[k]])),
});

// Same rules as the URL loader (spec 7.4): empty lists are unset; dates only with 'custom'.
function tidy(d: FilterDraft): FilterDraft {
  const n = { ...d };
  for (const k of ['status', 'matter', 'source'] as const)
    if (n[k]?.length === 0) n[k] = null;
  if (n.fu !== 'custom') n.fuFrom = n.fuTo = null;
  return n;
}

// 'YYYY-MM-DD' strings compare correctly as text; equal is allowed.
const reversed = (from: string | null, to: string | null) =>
  !!from && !!to && from > to;

type DraftErrors = { fu?: 'empty' | 'reversed'; created?: 'reversed' };

/** The panel's working copy. Nothing reaches the URL until the caller applies `apply()`. */
export function useFilterDraft(applied: FilterDraft) {
  const [draft, setDraft] = useState(() => pickDraft(applied));

  const set = useCallback(
    (patch: Partial<FilterDraft>) => setDraft((d) => tidy({ ...d, ...patch })),
    [],
  );
  const clearAll = useCallback(() => setDraft(EMPTY_DRAFT), []);
  const reset = useCallback(() => setDraft(pickDraft(applied)), [applied]);

  const errors: DraftErrors = {};
  if (draft.fu === 'custom' && !draft.fuFrom && !draft.fuTo)
    errors.fu = 'empty';
  else if (reversed(draft.fuFrom, draft.fuTo)) errors.fu = 'reversed';
  if (reversed(draft.createdFrom, draft.createdTo)) errors.created = 'reversed';

  const base = pickDraft(applied);
  return {
    draft,
    set,
    clearAll,
    reset,
    /** The patch to write to the URL. */
    apply: (): FilterDraft => draft,
    errors,
    valid: Object.keys(errors).length === 0,
    dirty: KEYS.some(
      (k) => JSON.stringify(draft[k]) !== JSON.stringify(base[k]),
    ),
    /** Filter groups set in the draft (the "N" in "Filters · N"). */
    groups: [
      draft.status,
      draft.matter,
      draft.source,
      draft.fu,
      draft.createdFrom ?? draft.createdTo,
    ].filter(Boolean).length,
  };
}
