import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContactsView } from './contacts-view';
import { FACETS, rows, wrapper } from './test-utils';

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
  document.cookie = 'filters_open=; max-age=0; path=/';
});

function renderView({
  desktop = true,
  filtersOpen = false,
  matching = 3,
  ...opts
}: Parameters<typeof wrapper>[0] & {
  desktop?: boolean;
  filtersOpen?: boolean;
  matching?: number;
} = {}) {
  stubViewport(desktop);
  return render(
    <ContactsView
      rows={rows(3)}
      total={1200}
      matching={matching}
      facets={FACETS}
      page={1}
      pageSize={250}
      filtersOpen={filtersOpen}
    />,
    { wrapper: wrapper(opts) },
  );
}

const filtersButton = () => screen.getByRole('button', { name: /^Filters/ });

describe('ContactsView', () => {
  it('first run shows only the empty state: nothing to search or filter yet', () => {
    stubViewport(true);
    render(
      <ContactsView
        rows={[]}
        total={0}
        matching={0}
        facets={{ ...FACETS, total: 0, matching: 0 }}
        page={1}
        pageSize={250}
        filtersOpen={false}
      />,
      { wrapper: wrapper() },
    );
    expect(screen.getByText('No contacts yet.')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(
      screen.queryByRole('navigation', { name: 'Quick views' }),
    ).toBeNull();
  });
});

describe('Filters panel in the list', () => {
  it('starts closed, opens from the Filters button and moves focus in', async () => {
    const user = userEvent.setup();
    renderView();
    expect(screen.queryByRole('complementary', { name: 'Filters' })).toBeNull();
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'false');

    await user.click(filtersButton());
    // The first open fetches the panel's code, which is slow on a cold test run.
    const panel = await screen.findByRole(
      'complementary',
      { name: 'Filters' },
      { timeout: 5000 },
    );
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(panel).toHaveFocus());
  });

  it('Esc closes it and returns focus to the Filters button', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(filtersButton());
    await screen.findByRole('complementary', { name: 'Filters' });

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(filtersButton()).toHaveFocus();
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('Apply writes the URL once, closes, and focus returns to the button', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderView({ searchParams: '?page=3', onUrlUpdate });
    await user.click(filtersButton());
    await user.click(await screen.findByRole('checkbox', { name: /^Closed/ }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalledTimes(1));
    const url = onUrlUpdate.mock.calls[0]![0].searchParams as URLSearchParams;
    expect(url.get('status')).toBe('closed');
    expect(url.has('page')).toBe(false);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(filtersButton()).toHaveFocus();
  });

  it('is open on first render when the cookie said so, without taking focus', async () => {
    renderView({ filtersOpen: true });
    const panel = await screen.findByRole('complementary', { name: 'Filters' });
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveFocus();
  });

  it('remembers open and closed in a cookie (desktop only)', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(filtersButton());
    expect(document.cookie).toContain('filters_open=1');
    await user.keyboard('{Escape}');
    expect(document.cookie).toContain('filters_open=0');
  });

  it('on a narrow screen it opens as a modal sheet, ignores the cookie and writes none', async () => {
    const user = userEvent.setup();
    renderView({ desktop: false, filtersOpen: true });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(filtersButton()).toHaveAttribute('aria-expanded', 'false');

    await user.click(filtersButton());
    expect(
      await screen.findByRole('dialog', { name: /^Filters/ }),
    ).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(filtersButton()).toHaveFocus());
    expect(document.cookie).not.toContain('filters_open');
  });

  it('is still there when nothing matches, so the filters can be changed', async () => {
    const user = userEvent.setup();
    renderView({ matching: 0, searchParams: '?status=closed' });
    await user.click(filtersButton());
    expect(
      await screen.findByRole('complementary', { name: 'Filters' }),
    ).toBeVisible();
  });
});
