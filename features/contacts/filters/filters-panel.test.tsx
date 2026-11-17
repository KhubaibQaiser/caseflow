import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FACETS, wrapper } from '../list/test-utils';
import { FiltersPanel } from './filters-panel';

function stubViewport(desktop: boolean) {
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: desktop,
    media,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}
afterEach(() => {
  cleanup(); // unmount before the stubbed matchMedia goes away
  vi.unstubAllGlobals();
});

const lastUrl = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.calls.at(-1)![0].searchParams as URLSearchParams;

function setup({
  searchParams = '',
  desktop = true,
  open = true,
  hideStatus,
  facets = FACETS,
  focusOnOpen,
}: {
  searchParams?: string;
  desktop?: boolean;
  open?: boolean;
  hideStatus?: boolean;
  facets?: typeof FACETS;
  focusOnOpen?: boolean;
} = {}) {
  stubViewport(desktop);
  const onUrlUpdate = vi.fn();
  const onOpenChange = vi.fn();
  const ui = (isOpen: boolean) => (
    <FiltersPanel
      open={isOpen}
      onOpenChange={onOpenChange}
      facets={facets}
      hideStatus={hideStatus}
      focusOnOpen={focusOnOpen}
    />
  );
  const view = render(ui(open), {
    wrapper: wrapper({ searchParams, onUrlUpdate }),
  });
  return {
    onUrlUpdate,
    onOpenChange,
    rerender: (o: boolean) => view.rerender(ui(o)),
  };
}

describe('FiltersPanel draft, Apply and Cancel', () => {
  it('ticking Active then Apply writes the URL once, resets the page and closes', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, onOpenChange } = setup({
      searchParams: '?status=lead&page=5',
    });
    await user.click(screen.getByRole('checkbox', { name: /^Active/ }));
    expect(onUrlUpdate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    expect(lastUrl(onUrlUpdate).get('status')).toBe('lead,active');
    expect(lastUrl(onUrlUpdate).has('page')).toBe(false);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('double-clicking Apply sends one request', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = setup();
    await user.click(screen.getByRole('checkbox', { name: /^Active/ }));
    await user.dblClick(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate).toHaveBeenCalledTimes(1);
  });

  it('Apply with nothing changed just closes', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, onOpenChange } = setup({
      searchParams: '?status=lead',
    });
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onUrlUpdate).not.toHaveBeenCalled();
  });

  it('Cancel discards the draft, and reopening shows the applied state', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, onOpenChange, rerender } = setup({
      searchParams: '?status=lead',
    });
    await user.click(screen.getByRole('checkbox', { name: /^Active/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onUrlUpdate).not.toHaveBeenCalled();

    rerender(false);
    rerender(true);
    expect(screen.getByRole('checkbox', { name: /^Lead/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^Active/ })).not.toBeChecked();
  });

  it('Clear all empties the draft only; Cancel keeps the applied filters', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, rerender } = setup({
      searchParams: '?status=lead,active&matter=family',
    });
    expect(screen.getByRole('heading', { name: 'Filters · 2' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getByRole('heading', { name: 'Filters · 0' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /^Lead/ })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onUrlUpdate).not.toHaveBeenCalled();
    rerender(false);
    rerender(true);
    expect(screen.getByRole('checkbox', { name: /^Lead/ })).toBeChecked();
  });

  it('Clear all then Apply removes every filter in one write', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = setup({
      searchParams: '?status=lead&matter=family&fu=overdue&q=ana',
    });
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    const url = lastUrl(onUrlUpdate);
    expect([...url.keys()]).toEqual(['q']); // the search box is not a filter group
  });

  it('Esc and the close button discard and close', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, onOpenChange } = setup();
    await user.click(screen.getByRole('checkbox', { name: /^Active/ }));
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();
    await user.click(screen.getByRole('button', { name: 'Close filters' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onUrlUpdate).not.toHaveBeenCalled();
  });
});

describe('FiltersPanel overlay, backdrop and dismissal', () => {
  it('is fixed to the viewport, never in flow, with a backdrop beside it', () => {
    setup();
    expect(screen.getByRole('complementary').className).toContain('fixed');
    expect(document.querySelector('[data-filters-backdrop]')).not.toBeNull();
  });

  it('clicking the backdrop closes without writing', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onUrlUpdate } = setup();
    await user.click(document.querySelector('[data-filters-backdrop]')!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onUrlUpdate).not.toHaveBeenCalled();
  });

  it('Esc closes it even when focus is outside the panel', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();
    document.body.focus();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('exits with a slide and a fade (it stays mounted while it plays)', () => {
    const { rerender } = setup({ focusOnOpen: true });
    rerender(false);
    const aside = screen.getByRole('complementary', { hidden: true });
    expect(aside).toHaveAttribute('data-closing');
    expect(aside.className).toContain('data-closing:animate-panel-out');
    expect(
      document.querySelector('[data-filters-backdrop]')!.className,
    ).toContain('data-closing:animate-scrim-out');
  });

  it('a restored panel shows the backdrop without fading it in', () => {
    setup();
    expect(
      document.querySelector('[data-filters-backdrop]')!.className,
    ).not.toContain('animate-scrim-in');
  });
});

describe('FiltersPanel groups and facets', () => {
  it('shows every group with its facet count beside each option', () => {
    setup();
    const status = screen.getByRole('group', { name: 'Status' });
    expect(
      within(status).getByRole('checkbox', { name: 'Lead 480' }),
    ).toBeInTheDocument();
    const followUp = screen.getByRole('group', { name: /^Follow-up/ });
    expect(
      within(followUp).getByRole('radio', { name: 'Overdue 38' }),
    ).toBeInTheDocument();
    expect(within(followUp).getByRole('radio', { name: 'Any' })).toBeChecked();
    expect(
      within(followUp).getByRole('radio', { name: 'Next 7 days 160' }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Matter type' })).getByRole(
        'checkbox',
        { name: 'Personal injury 200' },
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Referral source' })).getByRole(
        'checkbox',
        { name: 'Google search 216' },
      ),
    ).toBeInTheDocument();
  });

  it('writes zero counts as 0 and keeps the option usable', () => {
    setup({
      facets: {
        ...FACETS,
        matching: 0,
        facets: {
          ...FACETS.facets,
          status: { lead: 0, active: 0, closed: 0 },
        },
      },
    });
    const closed = screen.getByRole('checkbox', { name: 'Closed 0' });
    expect(closed).toBeEnabled();
  });

  it('hideStatus drops the Status group', () => {
    setup({ hideStatus: true });
    expect(screen.queryByRole('group', { name: 'Status' })).toBeNull();
    expect(screen.getByRole('group', { name: /^Follow-up/ })).toBeVisible();
  });

  it('opens a collapsed group that holds a selection', () => {
    setup({ searchParams: '?createdFrom=2020-11-01' });
    const from = screen.getByRole('button', { name: 'From: Sun, Nov 1, 2020' });
    expect(from.closest('details')).toHaveAttribute('open');
  });

  it('on desktop only Created date collapses (and starts closed)', () => {
    setup();
    const collapsible = (name: string) =>
      screen.getByRole('group', { name }).closest('details');
    for (const name of [
      'Status',
      'Follow-up',
      'Matter type',
      'Referral source',
    ])
      expect(collapsible(name)).toBeNull();
    expect(collapsible('Created date')).not.toBeNull();
    expect(collapsible('Created date')).not.toHaveAttribute('open');
  });

  it("collapsible rows get the comp's .more rule; plain headings do not", () => {
    setup();
    const summary = screen
      .getByRole('group', { name: 'Created date' })
      .closest('details')!.firstElementChild!;
    expect(summary.className).toContain('border-t');
    expect(summary.className).toContain('border-line');
    expect(
      screen.getByRole('heading', { name: 'Status' }).className,
    ).not.toContain('border-t');
  });

  it('slides in only when the user opens it, not when restored from the cookie', () => {
    setup({ focusOnOpen: true });
    expect(screen.getByRole('complementary').className).toContain(
      'animate-panel-in',
    );
  });

  it('does not slide in when it was open on page load', () => {
    setup();
    expect(screen.getByRole('complementary').className).not.toContain(
      'animate-panel-in',
    );
  });

  it('on a phone Matter type, Referral source and Created date collapse', () => {
    setup({ desktop: false });
    const collapsible = (name: string) =>
      screen.getByRole('group', { name }).closest('details');
    for (const name of ['Status', 'Follow-up'])
      expect(collapsible(name)).toBeNull();
    for (const name of ['Matter type', 'Referral source', 'Created date'])
      expect(collapsible(name)).not.toHaveAttribute('open');
  });

  it('mutes a zero count but keeps the option usable and the 0 visible', () => {
    setup({
      facets: {
        ...FACETS,
        facets: {
          ...FACETS.facets,
          status: { lead: 0, active: 5, closed: 0 },
          followUp: { ...FACETS.facets.followUp, overdue: 0 },
        },
      },
    });
    const muted = (el: HTMLElement) => el.closest('label')!.className;
    expect(muted(screen.getByRole('checkbox', { name: 'Lead 0' }))).toContain(
      'text-ink-2',
    );
    expect(muted(screen.getByRole('radio', { name: 'Overdue 0' }))).toContain(
      'text-ink-2',
    );
    expect(
      muted(screen.getByRole('checkbox', { name: 'Active 5' })),
    ).not.toContain('text-ink-2');
    expect(screen.getByRole('checkbox', { name: 'Lead 0' })).toBeEnabled();
  });
});

describe('FiltersPanel group counts', () => {
  it('names how many are selected in each group, from the draft', async () => {
    const user = userEvent.setup();
    setup({ searchParams: '?matter=family,immigration&fu=overdue' });
    expect(
      screen.getByRole('group', { name: 'Matter type · 2' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Follow-up · 1' }),
    ).toBeInTheDocument();
    // Untouched groups stay plain.
    expect(screen.getByRole('group', { name: 'Status' })).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /^Lead/ }));
    expect(
      screen.getByRole('group', { name: 'Status · 1' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(
      screen.getByRole('group', { name: 'Matter type' }),
    ).toBeInTheDocument();
  });
});

describe('FiltersPanel follow-up and date rules', () => {
  it('Custom range reveals From and To; presets hide them and drop the dates', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = setup({
      searchParams: '?fu=custom&fuFrom=2026-11-03',
    });
    const followUp = screen.getByRole('group', { name: /^Follow-up/ });
    expect(
      within(followUp).getByRole('button', { name: /^From: / }),
    ).toBeVisible();
    expect(
      within(followUp).getByRole('button', { name: 'To: Pick a date' }),
    ).toBeVisible();

    await user.click(within(followUp).getByRole('radio', { name: /^Overdue/ }));
    expect(
      within(followUp).queryByRole('button', { name: /^From: / }),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    expect(lastUrl(onUrlUpdate).get('fu')).toBe('overdue');
    expect(lastUrl(onUrlUpdate).has('fuFrom')).toBe(false);
  });

  it('Custom with no date blocks Apply and says why', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, onOpenChange } = setup();
    await user.click(screen.getByRole('radio', { name: /Custom range/ }));
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply).toHaveAttribute('aria-disabled', 'true');
    // The reason is the button's description until a click opens its tooltip.
    const reasonId = apply.getAttribute('aria-describedby')!;
    await user.click(apply);
    expect(onUrlUpdate).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    const reason = document.getElementById(reasonId);
    expect(reason).toHaveTextContent('Pick a follow-up date.');
  });

  it('a reversed range shows a message and blocks Apply; an equal range passes', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate } = setup({
      searchParams: '?createdFrom=2026-11-20&createdTo=2026-11-03',
    });
    expect(
      screen.getByText('End is before start.', { selector: 'p' }),
    ).toBeVisible();
    const to = screen.getByRole('button', { name: /^To: / });
    expect(to).toHaveAttribute('aria-invalid', 'true');
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply).toHaveAttribute('aria-disabled', 'true');
    await user.click(apply);
    expect(onUrlUpdate).not.toHaveBeenCalled();
  });

  it('an equal range is allowed', () => {
    setup({ searchParams: '?createdFrom=2026-11-03&createdTo=2026-11-03' });
    expect(screen.queryByText('End is before start.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Apply' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('Esc inside an open calendar closes the calendar, not the panel', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup({
      searchParams: '?fu=custom&fuFrom=2026-11-03',
    });
    const followUp = screen.getByRole('group', { name: /^Follow-up/ });
    await user.click(within(followUp).getByRole('button', { name: /^From: / }));
    expect(screen.getByRole('dialog', { name: 'From' })).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe('FiltersPanel on a narrow screen', () => {
  it('is a modal sheet with the same groups and Apply', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, onOpenChange } = setup({ desktop: false });
    const sheet = screen.getByRole('dialog', { name: /^Filters/ });
    expect(sheet).toContainElement(document.activeElement as HTMLElement);
    await user.click(screen.getByRole('checkbox', { name: /^Active/ }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Esc closes the sheet without writing', async () => {
    const user = userEvent.setup();
    const { onUrlUpdate, onOpenChange } = setup({ desktop: false });
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onUrlUpdate).not.toHaveBeenCalled();
  });
});
