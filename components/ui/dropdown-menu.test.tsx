import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './dropdown-menu';

function MoveMenu({ onSelect }: { onSelect(status: string): void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">Move to…</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Move Marisol to</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onSelect('active')}>
          Active
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect('closed')}>
          Closed
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('opens with Enter and moves through items with the arrow keys', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MoveMenu onSelect={onSelect} />);

    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitem', { name: 'Active' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Closed' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('closed');
  });

  it('closes on Esc and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<MoveMenu onSelect={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Move to…' });

    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
