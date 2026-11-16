import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// The committed URL, as the App Router reports it once a navigation lands.
let url = '?status=closed';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(url),
}));

import { wrapper } from '@/features/contacts/list/test-utils';

import ContactsError from './error';

const serverError = () =>
  Object.assign(new Error('secret detail'), { digest: '2187364591' });

describe('contacts error boundary', () => {
  it('keeps the page header and toolbar, with the failure in the list frame', async () => {
    render(<ContactsError error={serverError()} retry={vi.fn()} />, {
      wrapper: wrapper({ searchParams: '?status=closed' }),
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Contacts' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Contacts didn't load.",
    );
    // The filters really are kept: the toolbar and its chips stay.
    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove Status filter' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The server didn't respond. Your filters are kept."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/secret detail/)).toBeNull();
  });

  it('names a network failure', () => {
    render(
      <ContactsError
        error={new TypeError('Failed to fetch')}
        retry={vi.fn()}
      />,
      { wrapper: wrapper() },
    );
    expect(
      screen.getByText(
        'Check your connection and retry. Your filters are kept.',
      ),
    ).toBeInTheDocument();
  });

  it('Retry re-fetches the segment', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<ContactsError error={serverError()} retry={retry} />, {
      wrapper: wrapper(),
    });
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('contacts error boundary recovery', () => {
  it('retries once the URL lands on a new list, not while it is typed', () => {
    url = '?status=closed&q=boom';
    const retry = vi.fn();
    const ui = () => <ContactsError error={serverError()} retry={retry} />;
    const { rerender } = render(ui(), {
      wrapper: wrapper({ searchParams: url }),
    });
    rerender(ui());
    expect(retry).not.toHaveBeenCalled();

    url = '?status=closed&q=ortega';
    rerender(ui());
    expect(retry).toHaveBeenCalledTimes(1);
    rerender(ui());
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
