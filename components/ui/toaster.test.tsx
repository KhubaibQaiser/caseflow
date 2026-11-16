import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Toaster, toast } from './toaster';

afterEach(() => {
  act(() => toast.dismiss());
  vi.useRealTimers();
});

function setupTimed() {
  vi.useFakeTimers();
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('Toaster', () => {
  it('dismisses a success toast after 6s', async () => {
    setupTimed();
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
    const user = setupTimed();
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

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    await wait(500);
    expect(screen.queryByText("Move didn't save.")).not.toBeInTheDocument();
  });

  it('runs the toast action', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(<Toaster />);

    act(() => {
      toast.success('Marisol Ortega moved to Active', {
        action: { label: 'Undo', onClick: onUndo },
      });
    });
    expect(
      await screen.findByText('Marisol Ortega moved to Active'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledOnce();
  });
});
