import { render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('ignores clicks while pending', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button
        variant="primary"
        pending
        pendingLabel="Saving…"
        onClick={onClick}
      >
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Saving…' });

    await user.click(button);
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(0);
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('stays focusable but inert with a disabled reason', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button
        variant="primary"
        disabledReason="Viewers can't edit contacts."
        onClick={onClick}
      >
        Edit
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Edit' });

    await user.tab();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await user.keyboard('{Enter}');
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not submit its form while blocked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button variant="primary" type="submit" pending>
          Save
        </Button>
      </form>,
    );

    await user.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
