import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FACETS, wrapper } from '@/features/contacts/list/test-utils';

// The adapter's transitions settle at once, so hold the board pending by hand.
let pending = true;
vi.mock('../contacts/url-state', async (orig) => {
  const m = await orig<typeof import('../contacts/url-state')>();
  return {
    ...m,
    useListQuery: () => {
      const [q, set] = m.useListQuery();
      return [q, set, pending] as const;
    },
  };
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/pipeline',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/ui/toaster', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { Board } from './board';
import { board } from './test-utils';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  pending = true;
});

const SORTS = {
  lead: 'urgency',
  active: 'urgency',
  closed: 'urgency',
} as const;

function renderBoard(searchParams: string, filters = {}) {
  return render(
    <Board
      columns={board()}
      filters={filters}
      sorts={SORTS}
      facets={FACETS}
      filtersOpen={false}
      onMove={vi.fn()}
      onLoadMore={vi.fn()}
    />,
    { wrapper: wrapper({ searchParams }) },
  );
}

const column = (name: string) =>
  screen.getByRole('region', { name: new RegExp(name) });
const skeletons = (el: HTMLElement) => el.querySelectorAll('.animate-pulse');

describe('Board while columns reload', () => {
  it('shows skeleton only in the column whose sort changed, after 300ms', () => {
    renderBoard('leadSort=name');
    act(() => void vi.advanceTimersByTime(299));
    expect(skeletons(column('Lead'))).toHaveLength(0);
    act(() => void vi.advanceTimersByTime(1));
    expect(skeletons(column('Lead')).length).toBeGreaterThan(0);
    expect(skeletons(column('Active'))).toHaveLength(0);
    expect(skeletons(column('Closed'))).toHaveLength(0);
    expect(within(column('Lead')).queryByText('Marisol Ortega')).toBeNull();
    expect(within(column('Active')).getByText('Person c')).toBeInTheDocument();
  });

  it('shows skeleton in every column when the filters changed', () => {
    renderBoard('q=zzz');
    act(() => void vi.advanceTimersByTime(300));
    for (const n of ['Lead', 'Active', 'Closed'])
      expect(skeletons(column(n)).length).toBeGreaterThan(0);
  });

  it('shows none when nothing differs from what is loaded', () => {
    renderBoard('');
    act(() => void vi.advanceTimersByTime(300));
    for (const n of ['Lead', 'Active', 'Closed'])
      expect(skeletons(column(n))).toHaveLength(0);
  });
});
