import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Button } from './button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from './dialog';

function DiscardDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">Cancel edit</Button>
      </DialogTrigger>
      <DialogContent
        title="Discard changes?"
        description="Your edits to Marisol Ortega haven't been saved."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Keep editing</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="primary">Discard</Button>
            </DialogClose>
          </>
        }
      />
    </Dialog>
  );
}

describe('DialogContent', () => {
  it('is named by its title, described by its description and starts on Cancel', async () => {
    const user = userEvent.setup();
    render(<DiscardDialog />);

    await user.click(screen.getByRole('button', { name: 'Cancel edit' }));

    const dialog = screen.getByRole('dialog', { name: 'Discard changes?' });
    expect(dialog).toHaveAccessibleDescription(
      "Your edits to Marisol Ortega haven't been saved.",
    );
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus();
  });

  it('scrolls inside the viewport at 320px wide or 200% zoom', async () => {
    const user = userEvent.setup();
    render(<DiscardDialog />);

    await user.click(screen.getByRole('button', { name: 'Cancel edit' }));

    expect(screen.getByRole('dialog')).toHaveClass(
      'max-h-[calc(100dvh-32px)]',
      'overflow-y-auto',
    );
  });
});
