import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Toaster, toast } from './toaster';

describe('Toaster', () => {
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
