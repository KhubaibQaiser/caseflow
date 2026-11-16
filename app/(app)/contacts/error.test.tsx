import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ContactsError from './error';

const serverError = () =>
  Object.assign(new Error('secret detail'), { digest: '2187364591' });

describe('contacts error boundary', () => {
  it('says what failed, why, and that the filters are kept', () => {
    render(<ContactsError error={serverError()} retry={vi.fn()} />);
    expect(
      screen.getByRole('heading', { level: 1, name: "Contacts didn't load." }),
    ).toHaveFocus();
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
    render(<ContactsError error={serverError()} retry={retry} />);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
