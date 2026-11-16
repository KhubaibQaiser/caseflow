import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Filtered, FirstRun, NewContactLink } from './empty-states';
import { VIEWER, wrapper } from './test-utils';

describe('EmptyStates', () => {
  it('filtered empty state lists filters and clears', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    render(<Filtered />, {
      wrapper: wrapper({
        searchParams: '?q=zz&status=closed&fu=overdue&sort=name&size=50',
        onUrlUpdate,
      }),
    });
    expect(
      screen.getByText('No contacts match these filters.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Search: “zz” · Status: Closed · Follow-up: Overdue'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    // Filters and search go; sort and page size stay.
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe(
        '?sort=name&size=50',
      ),
    );
  });

  it('first run offers New contact to an admin', () => {
    render(<FirstRun />, { wrapper: wrapper() });
    expect(screen.getByText('No contacts yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New contact' })).toHaveAttribute(
      'href',
      '/contacts/new',
    );
  });

  it('viewer sees no New contact button', () => {
    render(
      <>
        <NewContactLink />
        <FirstRun />
      </>,
      { wrapper: wrapper({ viewer: VIEWER }) },
    );
    expect(screen.queryByRole('link', { name: /New contact/ })).toBeNull();
    expect(
      screen.getByText('No contacts yet. An admin can add them.'),
    ).toBeInTheDocument();
  });
});
