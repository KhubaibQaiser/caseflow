import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The adapter's transitions settle at once, so hold the list pending by hand.
let pending = true;
vi.mock('../url-state', async (orig) => {
  const m = await orig<typeof import('../url-state')>();
  return {
    ...m,
    useListQuery: () => {
      const [q, set] = m.useListQuery();
      return [q, set, pending] as const;
    },
  };
});

import { ContactsView } from './contacts-view';
import { FACETS, rows, wrapper } from './test-utils';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: true,
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  pending = true;
});

function renderView(n = 3) {
  return render(
    <ContactsView
      rows={rows(n)}
      total={1200}
      matching={n}
      facets={FACETS}
      page={1}
      pageSize={250}
      filtersOpen={false}
    />,
    { wrapper: wrapper() },
  );
}

const skeletons = (c: HTMLElement) =>
  c.querySelectorAll('tbody .animate-pulse');

describe('ContactsView while filters load', () => {
  it('keeps the old rows until the wait is long enough to notice', () => {
    renderView();
    act(() => void vi.advanceTimersByTime(299));
    expect(screen.getAllByText('Person 0').length).toBeGreaterThan(0);
    expect(skeletons(document.body)).toHaveLength(0);
  });

  it('swaps the rows for skeleton rows under the same header after 300ms', () => {
    renderView();
    act(() => void vi.advanceTimersByTime(300));
    expect(screen.queryAllByText('Person 0')).toHaveLength(0);
    expect(
      screen.getByRole('columnheader', { name: 'Follow-up' }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(skeletons(document.body).length).toBeGreaterThan(0);
  });

  it('caps the skeleton at a screenful', () => {
    renderView(40);
    act(() => void vi.advanceTimersByTime(300));
    expect(document.querySelectorAll('tbody tr')).toHaveLength(12);
  });

  it('shows no spinner in the search, even after the delay', () => {
    renderView();
    act(() => void vi.advanceTimersByTime(300));
    const search = screen.getByRole('search');
    expect(search.querySelector('.animate-spin')).toBeNull();
    expect(within(search).getByRole('searchbox')).toBeInTheDocument();
  });

  it('brings the rows back when loading ends', () => {
    const { rerender } = renderView();
    act(() => void vi.advanceTimersByTime(300));
    pending = false;
    rerender(
      <ContactsView
        rows={rows(3)}
        total={1200}
        matching={3}
        facets={FACETS}
        page={1}
        pageSize={250}
        filtersOpen={false}
      />,
    );
    expect(screen.getAllByText('Person 0').length).toBeGreaterThan(0);
  });
});
