import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeToggle } from './theme-toggle';

function mockDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches: dark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  delete document.documentElement.dataset.theme;
  document.cookie = 'theme=; Max-Age=0; Path=/';
  mockDark(false);
});

// The menu code loads lazily; until then the button is a stand-in with no popup.
const loaded = () =>
  waitFor(() =>
    expect(
      document.querySelector('button[aria-haspopup="menu"]'),
    ).not.toBeNull(),
  );

describe('ThemeToggle', () => {
  // First in the file on purpose: React.lazy caches the chunk, so only the first render shows the stand-in.
  it('a click before the menu code has loaded is not lost: the menu opens when it arrives', async () => {
    render(<ThemeToggle />);
    // Synchronously after render, the lazy chunk cannot have resolved yet.
    fireEvent.click(screen.getByRole('button', { name: /^Theme/ }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(3);
  });

  it('labels the button with the theme and, for System, the effective one', () => {
    mockDark(true);
    render(<ThemeToggle />);
    expect(
      screen.getByRole('button', { name: 'Theme: System (dark)' }),
    ).toBeInTheDocument();
  });

  it('holds all three glyphs so CSS can pick one from the html attribute without a flash', () => {
    const { container } = render(<ThemeToggle />);
    expect(container.querySelector('.theme-sun')).not.toBeNull();
    expect(container.querySelector('.theme-moon')).not.toBeNull();
    expect(container.querySelector('.theme-system')).not.toBeNull();
  });

  it('opens a Theme menu of three radios, the current one checked', async () => {
    document.documentElement.dataset.theme = 'light';
    render(<ThemeToggle />);
    await loaded();
    await userEvent.click(screen.getByRole('button', { name: 'Theme: Light' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Theme')).toBeInTheDocument();
    const radios = within(menu).getAllByRole('menuitemradio');
    expect(radios.map((r) => r.textContent)).toEqual([
      'System',
      'Light',
      'Dark',
    ]);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  it('picking Dark sets the attribute and the cookie, closes the menu and updates the label', async () => {
    render(<ThemeToggle />);
    await loaded();
    await userEvent.click(screen.getByRole('button', { name: /^Theme/ }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.cookie).toContain('theme=dark');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Theme: Dark' }),
    ).toBeInTheDocument();
  });

  it('picking System removes the attribute', async () => {
    document.documentElement.dataset.theme = 'dark';
    render(<ThemeToggle />);
    await loaded();
    await userEvent.click(screen.getByRole('button', { name: /^Theme/ }));
    await userEvent.click(
      screen.getByRole('menuitemradio', { name: 'System' }),
    );
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.cookie).toContain('theme=system');
  });
});
