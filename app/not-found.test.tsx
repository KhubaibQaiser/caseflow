import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ShellNotFound from './(app)/not-found';
import RootNotFound from './not-found';

vi.mock('next/navigation', () => ({
  usePathname: () => '/contacts/no-such-contact',
}));

describe.each([
  ['root (signed out)', RootNotFound],
  ['inside the app shell', ShellNotFound],
])('not-found page, %s', (_, NotFound) => {
  it('names the requested path and focuses the heading', () => {
    render(<NotFound />);

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Page not found.',
    });
    expect(heading).toHaveFocus();
    expect(screen.getByText('/contacts/no-such-contact')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('links to contacts first, then the pipeline', () => {
    render(<NotFound />);

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Go to contacts',
      'Pipeline',
    ]);
    expect(links[0]).toHaveAttribute('href', '/contacts');
    expect(links[1]).toHaveAttribute('href', '/pipeline');
  });
});

it('the standalone page carries its own main landmark', () => {
  render(<RootNotFound />);

  expect(screen.getByRole('main')).toBeInTheDocument();
});
