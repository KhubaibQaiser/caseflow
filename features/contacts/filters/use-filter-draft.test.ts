import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EMPTY_DRAFT, useFilterDraft } from './use-filter-draft';
import type { FilterDraft } from './use-filter-draft';

const draftHook = (applied: Partial<FilterDraft> = {}) =>
  renderHook(() => useFilterDraft({ ...EMPTY_DRAFT, ...applied }));

describe('useFilterDraft', () => {
  it('starts as the applied filters and edits only the draft', () => {
    const { result } = draftHook({ status: ['lead'] });
    expect(result.current.draft.status).toEqual(['lead']);
    expect(result.current.dirty).toBe(false);

    act(() => result.current.set({ status: ['lead', 'active'] }));
    expect(result.current.draft.status).toEqual(['lead', 'active']);
    expect(result.current.dirty).toBe(true);
  });

  it('an emptied list is "not set"', () => {
    const { result } = draftHook({ status: ['lead'] });
    act(() => result.current.set({ status: [] }));
    expect(result.current.draft.status).toBeNull();
    expect(result.current.apply().status).toBeNull();
  });

  it('dates belong to Custom: picking a preset drops them', () => {
    const { result } = draftHook({
      fu: 'custom',
      fuFrom: '2026-11-03',
      fuTo: '2026-11-20',
    });
    act(() => result.current.set({ fu: 'overdue' }));
    expect(result.current.draft).toMatchObject({
      fu: 'overdue',
      fuFrom: null,
      fuTo: null,
    });
  });

  it('Custom needs a bound; either one is enough', () => {
    const { result } = draftHook();
    act(() => result.current.set({ fu: 'custom' }));
    expect(result.current.errors.fu).toBe('empty');
    expect(result.current.valid).toBe(false);

    act(() => result.current.set({ fuTo: '2026-11-20' }));
    expect(result.current.errors.fu).toBeUndefined();
    expect(result.current.valid).toBe(true);
  });

  it('a reversed range is an error; an equal one is fine', () => {
    const { result } = draftHook();
    act(() =>
      result.current.set({
        fu: 'custom',
        fuFrom: '2026-11-20',
        fuTo: '2026-11-03',
        createdFrom: '2026-02-01',
        createdTo: '2026-01-01',
      }),
    );
    expect(result.current.errors).toEqual({
      fu: 'reversed',
      created: 'reversed',
    });
    act(() =>
      result.current.set({ fuTo: '2026-11-20', createdTo: '2026-02-01' }),
    );
    expect(result.current.errors).toEqual({});
  });

  it('Clear all resets the draft, not the applied filters; reset returns to applied', () => {
    const { result } = draftHook({ status: ['lead'], matter: ['family'] });
    act(() => result.current.clearAll());
    expect(result.current.draft).toEqual(EMPTY_DRAFT);
    expect(result.current.groups).toBe(0);
    act(() => result.current.reset());
    expect(result.current.draft.status).toEqual(['lead']);
    expect(result.current.groups).toBe(2);
  });
});
