import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ListTransition } from '../url-state';
import { FACETS, VIEWER, wrapper } from './test-utils';
import { Toolbar } from './toolbar';

const lastUrl = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.calls.at(-1)![0].searchParams as URLSearchParams;

function renderToolbar(opts: Parameters<typeof wrapper>[0] = {}) {
  return render(
    <ListTransition>
      <Toolbar facets={FACETS} isPending={false} />
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
    await waitFor(() => expect(lastUrl(onUrlUpdate).get('q')).toBe('ana'));
    expect(lastUrl(onUrlUpdate).has('page')).toBe(false);
    expect(lastUrl(onUrlUpdate).get('sort')).toBe('name');
  });

  it('rapid typing sends only the final query, after the 250ms debounce', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderToolbar({ onUrlUpdate, rateLimitFactor: 1 });

    await user.type(screen.getByRole('searchbox'), 'kessler');
    expect(onUrlUpdate).not.toHaveBeenCalled();
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    expect(lastUrl(onUrlUpdate).get('q')).toBe('kessler');
  });

  it('Esc clears the search', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderToolbar({ searchParams: '?q=ortega', onUrlUpdate });
    const box = screen.getByRole('searchbox');
    expect(box).toHaveValue('ortega');

    await user.click(box);
    await user.keyboard('{Escape}');
    expect(box).toHaveValue('');
    await waitFor(() => expect(lastUrl(onUrlUpdate).has('q')).toBe(false));
  });
});

describe('Toolbar filters', () => {
  it('counts applied filter groups on the Filters button', () => {
    renderToolbar({ searchParams: '?status=lead,active&fu=overdue&q=ana' });
    const button = screen.getByRole('button', { name: 'Filters, 2 applied' });
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
