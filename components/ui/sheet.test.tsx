import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Button } from './button';
import { Dialog, DialogTrigger } from './dialog';
import { Sheet } from './sheet';

function FiltersSheet() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">Filters</Button>
      </DialogTrigger>
      <Sheet
        side="right"
        title="Filters"
        footer={<Button variant="primary">Apply</Button>}
      >
        <input aria-label="Search matter types" />
      </Sheet>
    </Dialog>
  );
}

describe('Sheet', () => {
  it('opens as a modal named by its title', async () => {
    const user = userEvent.setup();
    render(<FiltersSheet />);

    await user.click(screen.getByRole('button', { name: 'Filters' }));

    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    expect(sheet).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it.each([
    [
      'Esc',
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.keyboard('{Escape}'),
    ],
    [
      'the close button',
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole('button', { name: 'Close' })),
    ],
    [
      'the scrim',
      async (user: ReturnType<typeof userEvent.setup>) =>
        user.click(
          screen.getByRole('dialog').previousElementSibling as Element,
        ),
    ],
  ])('closes on %s and returns focus to the trigger', async (_, close) => {
    const user = userEvent.setup();
    render(<FiltersSheet />);
    const trigger = screen.getByRole('button', { name: 'Filters' });

    await user.click(trigger);
    await close(user);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
