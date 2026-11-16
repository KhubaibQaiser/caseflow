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

  it('shows the disabled reason on keyboard focus', async () => {
    const user = userEvent.setup();
    const reason = "Viewers can't edit contacts. Ask an admin.";
    render(
      <Button variant="ghost" disabledReason={reason}>
        Edit
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Edit' });
    expect(button).not.toHaveAttribute('title');
    expect(button).toHaveAccessibleDescription(reason);

    await user.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(reason);
    expect(button).toHaveAccessibleDescription(reason);
  });

  it('shows the disabled reason on tap', async () => {
    const user = userEvent.setup();
    const reason = "Viewers can't edit contacts. Ask an admin.";
    render(
      <Button variant="ghost" disabledReason={reason}>
        Edit
      </Button>,
    );

    await user.pointer({
      keys: '[TouchA]',
      target: screen.getByRole('button', { name: 'Edit' }),
    });
    expect(await screen.findByRole('tooltip')).toHaveTextContent(reason);
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

  it('keeps the disabled reason even if callers pass aria props', () => {
    render(
      <Button
        variant="ghost"
        disabledReason="Viewers can't edit contacts. Ask an admin."
        aria-disabled={false}
        aria-describedby="edit-hint"
        title="Edit"
      >
        Edit
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Edit' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    // The tooltip replaces the native title; the reason stays in the description.
    expect(button).not.toHaveAttribute('title');
    expect(button).toHaveAccessibleDescription(
      "Viewers can't edit contacts. Ask an admin.",
    );
    expect(button.getAttribute('aria-describedby')).toContain('edit-hint');
  });

  it("keeps the caller's title and aria-disabled without a disabled reason", () => {
    render(
      <Button variant="ghost" title="Edit contact" aria-disabled="true">
        Edit
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Edit' });
    expect(button).toHaveAttribute('title', 'Edit contact');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});
