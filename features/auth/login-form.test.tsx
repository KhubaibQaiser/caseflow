import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fail, type Result } from '@/lib/contracts/result';

import { LoginForm } from './login-form';

type Action = (
  prev: Result<null> | null,
  data: FormData,
) => Promise<Result<null>>;

const never = (): Promise<Result<null>> => new Promise(() => {});

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'Sam@Firm.com');
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'hunter2',
  );
}
const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Sign in' }));

afterEach(() => vi.useRealTimers());

describe('LoginForm', () => {
  it('validates on submit, per field, without calling the action', async () => {
    const action = vi.fn<Action>();
    const user = userEvent.setup();
    render(<LoginForm action={action} />);
    await user.type(screen.getByLabelText('Email'), 'sarah@');
    await submit(user);

    expect(screen.getByText('Enter a valid email address.')).toBeVisible();
    expect(screen.getByText('Enter your password.')).toBeVisible();
    expect(screen.getByLabelText('Email')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(action).not.toHaveBeenCalled();
  });

  it('shows invalid credentials in an alert and keeps what was typed', async () => {
    const action = vi.fn<Action>(async () =>
      fail('invalid_credentials', 'Email or password is incorrect.'),
    );
    const user = userEvent.setup();
    render(<LoginForm action={action} />);
    await fill(user);
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password is incorrect.',
    );
    expect(screen.getByLabelText('Email')).toHaveValue('Sam@Firm.com');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveValue(
      'hunter2',
    );
  });

  it('shows a server error in an alert', async () => {
    const action = vi.fn<Action>(async () =>
      fail('server', 'Could not sign in. Try again.'),
    );
    const user = userEvent.setup();
    render(<LoginForm action={action} />);
    await fill(user);
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not sign in. Try again.',
    );
  });

  it('maps server field errors onto the fields', async () => {
    const action = vi.fn<Action>(async () =>
      fail('validation', 'Fix the highlighted fields.', {
        fieldErrors: { email: 'Enter a valid email address.' },
      }),
    );
    const user = userEvent.setup();
    render(<LoginForm action={action} />);
    await fill(user);
    await submit(user);
    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeVisible();
  });

  it('locks Sign in until retryAfter passes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const action = vi.fn<Action>(async () =>
      fail('rate_limited', 'Too many attempts. Try again in 5 minutes.', {
        retryAfter: 300,
      }),
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<LoginForm action={action} />);
    await fill(user);
    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Try again in 5 minutes.',
    );
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(299_000));
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(1_500));
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the session-ended banner as a status, not an alert', () => {
    render(<LoginForm action={vi.fn<Action>()} reason="expired" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your session ended. Sign in to pick up where you left off.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows no banner by default and the invitation footer always', () => {
    render(<LoginForm action={vi.fn<Action>()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Access is by invitation. Ask your administrator for an account.',
      ),
    ).toBeVisible();
  });

  it('toggles password visibility with aria-pressed', async () => {
    const user = userEvent.setup();
    render(<LoginForm action={vi.fn<Action>()} />);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute(
      'type',
      'password',
    );
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute(
      'type',
      'text',
    );
  });

  it('focuses the email field on load', () => {
    render(<LoginForm action={vi.fn<Action>()} />);
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('clears a field error once that field changes', async () => {
    const user = userEvent.setup();
    render(<LoginForm action={vi.fn<Action>()} />);
    await submit(user);
    await user.type(screen.getByLabelText('Email'), 'a');
    expect(
      screen.queryByText('Enter a valid email address.'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeVisible();
  });

  it('clears the password on a rate limit but keeps the email', async () => {
    const action = vi.fn<Action>(async () =>
      fail('rate_limited', 'Too many attempts. Try again in 5 minutes.', {
        retryAfter: 300,
      }),
    );
    const user = userEvent.setup();
    render(<LoginForm action={action} />);
    await fill(user);
    await submit(user);
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveValue('Sam@Firm.com');
  });

  // Last: their never-resolving actions leave a pending transition that stalls later tests.
  it('is busy while pending', async () => {
    const user = userEvent.setup();
    render(<LoginForm action={vi.fn<Action>(never)} />);
    await fill(user);
    await submit(user);
    const button = await screen.findByRole('button', { name: 'Signing in…' });
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('sends one request on a double submit', async () => {
    const action = vi.fn<Action>(never);
    const user = userEvent.setup();
    render(<LoginForm action={action} />);
    await fill(user);
    await submit(user);
    await user.click(screen.getByRole('button', { name: 'Signing in…' }));
    await user.type(
      screen.getByLabelText('Password', { exact: true }),
      '{Enter}',
    );
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('round-trips next and the time zone as hidden fields', async () => {
    const action = vi.fn<Action>(never);
    const user = userEvent.setup();
    render(<LoginForm action={action} next="/contacts/42?tab=notes" />);
    await fill(user);
    await submit(user);
    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0]![1];
    expect(data.get('next')).toBe('/contacts/42?tab=notes');
    expect(data.get('tz')).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    expect(data.get('email')).toBe('Sam@Firm.com');
  });

  it('omits next when none was given', async () => {
    const action = vi.fn<Action>(never);
    const user = userEvent.setup();
    render(<LoginForm action={action} />);
    await fill(user);
    await submit(user);
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls[0]![1].has('next')).toBe(false);
  });

  it('validates what was submitted, not React state (autofill sets no change event)', async () => {
    const action = vi.fn<Action>(never);
    const user = userEvent.setup();
    render(<LoginForm action={action} />);
    // Assigning .value directly fires no event, like a password manager fill.
    (screen.getByLabelText('Email') as HTMLInputElement).value = 'a@firm.com';
    (
      screen.getByLabelText('Password', { exact: true }) as HTMLInputElement
    ).value = 'pw';
    await submit(user);
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(screen.queryByText('Enter your password.')).not.toBeInTheDocument();
    expect(action.mock.calls[0]![1].get('password')).toBe('pw');
  });
});
