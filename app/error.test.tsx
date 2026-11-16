import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ErrorPage from './error';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

function serverError() {
  // Next forwards Server Component errors with a generic message and a digest.
  return Object.assign(new Error('secret detail: row 42 failed'), {
    digest: '2187364591',
  });
}

describe('error page', () => {
  beforeEach(() => refresh.mockClear());

  it('announces the failure and focuses the heading', () => {
    render(<ErrorPage error={serverError()} reset={vi.fn()} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Something broke on our side.',
      }),
    ).toHaveFocus();
  });

  it('Retry refreshes server data, then resets the boundary', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ErrorPage error={serverError()} reset={reset} />);

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(refresh.mock.invocationCallOrder[0]).toBeLessThan(
      reset.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('links back to contacts', () => {
    render(<ErrorPage error={serverError()} reset={vi.fn()} />);

    expect(
      screen.getByRole('link', { name: 'Go to contacts' }),
    ).toHaveAttribute('href', '/contacts');
  });

  it('shows the server reason and digest, never the message', () => {
    render(<ErrorPage error={serverError()} reset={vi.fn()} />);

    expect(screen.getByText(/^Server error\./)).toBeInTheDocument();
    expect(screen.getByText('2187364591')).toBeInTheDocument();
    expect(screen.queryByText(/secret detail/)).not.toBeInTheDocument();
  });

  it('classifies a failed fetch as a network error', () => {
    render(
      <ErrorPage error={new TypeError('Failed to fetch')} reset={vi.fn()} />,
    );

    expect(screen.getByText(/^Network error\./)).toBeInTheDocument();
    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });

  it('falls back to an unknown reason for anything else', () => {
    render(<ErrorPage error="thrown string" reset={vi.fn()} />);

    expect(screen.getByText(/^Unexpected error\./)).toBeInTheDocument();
    expect(screen.queryByText(/thrown string/)).not.toBeInTheDocument();
  });
});
