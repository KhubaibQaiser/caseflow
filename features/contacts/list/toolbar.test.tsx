import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFiltersPanel } from '../filters/use-filters-panel';
import { ListTransition, useListQuery } from '../url-state';
import { FACETS, VIEWER, wrapper } from './test-utils';
import { Toolbar } from './toolbar';

afterEach(() => vi.unstubAllGlobals());

const lastUrl = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.calls.at(-1)![0].searchParams as URLSearchParams;

function WithPanel() {
  const filtersButton = useRef<HTMLButtonElement>(null);
  const panel = useFiltersPanel(false, filtersButton);
  return (
    <Toolbar
      facets={FACETS}
      isPending={false}
      panel={panel}
      filtersButton={filtersButton}
    />
  );
}

function renderToolbar(
  opts: Parameters<typeof wrapper>[0] = {},
  extra?: ReactNode,
) {
  // matchMedia is absent in jsdom; the panel hook reads it.
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: true,
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  return render(
    <ListTransition>
      <WithPanel />
      {extra}
    </ListTransition>,
    { wrapper: wrapper(opts) },
  );
}

describe('Toolbar search', () => {
  it('changing search resets page to 1', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderToolbar({ searchParams: '?page=5&sort=name', onUrlUpdate });

    await user.type(
      screen.getByRole('searchbox', { name: 'Search contacts' }),
      'ana',
    );
    // One write carries both q and the page reset: never `?q=ana&page=5` first.
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    expect(lastUrl(onUrlUpdate).get('q')).toBe('ana');
    expect(lastUrl(onUrlUpdate).has('page')).toBe(false);
    expect(lastUrl(onUrlUpdate).get('sort')).toBe('name');
  });

  it('typing several characters from page 5 writes the URL exactly once', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderToolbar({ searchParams: '?page=5', onUrlUpdate, rateLimitFactor: 1 });

    await user.type(screen.getByRole('searchbox'), 'kessler');
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    // Let any straggling timer fire before counting.
    await new Promise((r) => setTimeout(r, 400));
    expect(onUrlUpdate).toHaveBeenCalledTimes(1);
    expect(lastUrl(onUrlUpdate).get('q')).toBe('kessler');
    expect(lastUrl(onUrlUpdate).has('page')).toBe(false);
  });

  it('never writes q with a stale page, even when timers fire one at a time', () => {
    vi.useFakeTimers();
    try {
      const onUrlUpdate = vi.fn();
      renderToolbar({
        searchParams: '?page=5',
        onUrlUpdate,
        rateLimitFactor: 1,
      });
      const box = screen.getByRole('searchbox');
      fireEvent.change(box, { target: { value: 'k' } });
      fireEvent.change(box, { target: { value: 'ke' } });
      // A slow machine runs nuqs's per-key timers a tick apart; step through them singly.
      for (let i = 0; i < 6; i++) act(() => void vi.advanceTimersToNextTimer());
      for (const [update] of onUrlUpdate.mock.calls) {
        const url = update.searchParams as URLSearchParams;
        expect(url.get('q') === 'ke' && url.get('page') === '5').toBe(false);
      }
      expect(onUrlUpdate).toHaveBeenCalledTimes(1);
      expect(lastUrl(onUrlUpdate).get('q')).toBe('ke');
      expect(lastUrl(onUrlUpdate).has('page')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('holds q and the page together until the debounce ends (one commit, not per-key)', () => {
    vi.useFakeTimers();
    try {
      function Probe() {
        const [q] = useListQuery();
        return <output aria-label="url q">{q.q ?? ''}</output>;
      }
      renderToolbar({ searchParams: '?page=5' }, <Probe />);
      const box = screen.getByRole('searchbox');
      fireEvent.change(box, { target: { value: 'ke' } });
      act(() => void vi.advanceTimersByTime(200));
      expect(box).toHaveValue('ke');
      expect(screen.getByLabelText('url q')).toHaveTextContent('');
      act(() => void vi.advanceTimersByTime(100));
      expect(screen.getByLabelText('url q')).toHaveTextContent('ke');
    } finally {
      vi.useRealTimers();
    }
  });

  it('an outside q change cancels a keystroke still waiting to be written', () => {
    vi.useFakeTimers();
    try {
      const onUrlUpdate = vi.fn();
      function Outside() {
        const [, setQuery] = useListQuery();
        return (
          <button type="button" onClick={() => setQuery({ q: null })}>
            Remove chip
          </button>
        );
      }
      renderToolbar({ searchParams: '?q=smith', onUrlUpdate }, <Outside />);
      const box = screen.getByRole('searchbox');
      fireEvent.change(box, { target: { value: 'smithe' } });
      act(() => void vi.advanceTimersByTime(100));
      fireEvent.click(screen.getByRole('button', { name: 'Remove chip' }));
      expect(box).toHaveValue('');
      act(() => void vi.advanceTimersByTime(400));
      // The removed q stays removed: "smithe" never lands.
      for (const [update] of onUrlUpdate.mock.calls)
        expect((update.searchParams as URLSearchParams).get('q')).not.toBe(
          'smithe',
        );
      expect(box).toHaveValue('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a URL echo that arrives after a newer keystroke does not clobber it', () => {
    vi.useFakeTimers();
    try {
      renderToolbar({ rateLimitFactor: 1 });
      const box = screen.getByRole('searchbox');
      fireEvent.change(box, { target: { value: 'ab' } });
      // The commit and the next key land before React renders the echo of q=ab.
      act(() => {
        vi.advanceTimersByTime(250);
        fireEvent.change(box, { target: { value: 'abc' } });
      });
      expect(box).toHaveValue('abc');
    } finally {
      vi.useRealTimers();
    }
  });

  it('the box follows q when the URL changes from outside', async () => {
    const user = userEvent.setup();
    function Outside() {
      const [, setQuery] = useListQuery();
      return (
        <button type="button" onClick={() => setQuery({ q: 'zed' })}>
          Outside
        </button>
      );
    }
    renderToolbar({ searchParams: '?q=ortega' }, <Outside />);
    const box = screen.getByRole('searchbox');
    expect(box).toHaveValue('ortega');
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => expect(box).toHaveValue('zed'));
  });

  it('Esc clears the search', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderToolbar({ searchParams: '?q=ortega', onUrlUpdate });
    const box = screen.getByRole('searchbox');
    expect(box).toHaveValue('ortega');

    await user.click(box);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(box).toHaveValue(''));
    await waitFor(() => expect(lastUrl(onUrlUpdate).has('q')).toBe(false));
  });

  it('keeps a whitespace-only search out of the URL', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderToolbar({ searchParams: '?q=a&page=2', onUrlUpdate });
    const box = screen.getByRole('searchbox');
    await user.clear(box);
    await user.type(box, '   ');
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    await waitFor(() => expect(lastUrl(onUrlUpdate).has('q')).toBe(false));
    // The box mirrors the URL, so whitespace alone simply doesn't take.
    await waitFor(() => expect(box).toHaveValue(''));
  });
});

describe('Toolbar filters', () => {
  it('counts applied filter groups on the Filters button', () => {
    renderToolbar({ searchParams: '?status=lead,active&fu=overdue&q=ana' });
    const button = screen.getByRole('button', { name: 'Filters 2 applied' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('quick views are links with live counts and the current view marked', () => {
    renderToolbar({ searchParams: '?fu=overdue&status=lead&page=3' });
    const nav = screen.getByRole('navigation', { name: 'Quick views' });
    expect(nav).toBeInTheDocument();
    const overdue = screen.getByRole('link', { name: 'Overdue 38' });
    expect(overdue).toHaveAttribute('aria-current', 'true');
    // Switching view keeps other filters and drops the page.
    expect(screen.getByRole('link', { name: 'All 1,200' })).toHaveAttribute(
      'href',
      '/contacts?status=lead',
    );
    expect(screen.getByRole('link', { name: 'Due today 12' })).toHaveAttribute(
      'href',
      '/contacts?status=lead&fu=dueToday',
    );
  });

  it('removing a chip clears that filter, resets the page and moves focus', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderToolbar({
      searchParams: '?status=lead,active&matter=family&page=4',
      onUrlUpdate,
    });
    expect(screen.getByText('Lead, Active')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Remove Status filter' }),
    );
    await waitFor(() => expect(lastUrl(onUrlUpdate).has('status')).toBe(false));
    expect(lastUrl(onUrlUpdate).get('matter')).toBe('family');
    expect(lastUrl(onUrlUpdate).has('page')).toBe(false);
    // Focus goes to the next chip, then to the Filters button once none are left.
    const matter = screen.getByRole('button', { name: 'Remove Matter filter' });
    expect(matter).toHaveFocus();

    await user.click(matter);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Filters/ })).toHaveFocus(),
    );
  });

  it('shows a custom follow-up range as one chip', () => {
    renderToolbar({
      searchParams: '?fu=custom&fuFrom=2026-11-03&fuTo=2026-11-20',
    });
    expect(screen.getByText('Nov 3, 2026 – Nov 20, 2026')).toBeInTheDocument();
  });
});

describe('Toolbar without a panel (error screen)', () => {
  it('keeps the Filters button but says why it cannot open yet', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('matchMedia', (media: string) => ({
      matches: true,
      media,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    function Bare() {
      const ref = useRef<HTMLButtonElement>(null);
      return <Toolbar isPending={false} filtersButton={ref} />;
    }
    render(<Bare />, { wrapper: wrapper({ searchParams: '?status=lead' }) });
    const button = screen.getByRole('button', { name: 'Filters 1 applied' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Toolbar sort (mobile)', () => {
  it('names the current sort and sets a new one from the menu', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderToolbar({ searchParams: '?page=2', onUrlUpdate, viewer: VIEWER });

    const trigger = await screen.findByRole('button', {
      name: 'Sort: Follow-up, soonest first',
      expanded: false, // the Radix trigger, not the stand-in shown while it loads
    });
    await user.click(trigger);
    await act(async () => {
      await user.click(
        await screen.findByRole('menuitemradio', { name: 'Name, Z to A' }),
      );
    });
    await waitFor(() => expect(lastUrl(onUrlUpdate).get('sort')).toBe('name'));
    expect(lastUrl(onUrlUpdate).get('dir')).toBe('desc');
    expect(lastUrl(onUrlUpdate).has('page')).toBe(false);
  });
});
