import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Toaster, toast } from './toaster';

afterEach(() => {
  act(() => toast.dismiss());
  vi.useRealTimers();
});

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('Toaster', () => {
  it('dismisses a success toast after 6s', async () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast.success('Contact saved');
    });
    await wait(10); // sonner renders on the next tick
    expect(screen.getByText('Contact saved')).toBeInTheDocument();

    await wait(5000);
    expect(screen.getByText('Contact saved')).toBeInTheDocument();
    await wait(2000);
    expect(screen.queryByText('Contact saved')).not.toBeInTheDocument();
  });

  it('keeps an error toast with an action until it is dismissed', async () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast.error("Move didn't save.", {
        action: { label: 'Retry', onClick: vi.fn() },
      });
    });
    await wait(10);
    expect(screen.getByText("Move didn't save.")).toBeInTheDocument();

    await wait(60_000);
    expect(screen.getByText("Move didn't save.")).toBeInTheDocument();

    // user-event stalls under sonner with fake timers; a plain click is enough here.
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await wait(500);
    expect(screen.queryByText("Move didn't save.")).not.toBeInTheDocument();
  });

  it('runs the Retry action from inside the live region', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<Toaster />);

    act(() => {
      toast.error("Move didn't save.", {
        action: { label: 'Retry', onClick: onRetry },
      });
    });
    const message = await screen.findByText("Move didn't save.");
    expect(message.closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite',
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
