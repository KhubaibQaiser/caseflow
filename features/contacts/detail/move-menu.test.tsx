import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ContactRow } from '@/lib/contracts/contact';
import { ok, type Result } from '@/lib/contracts/result';

import { MoveMenu } from './move-menu';
import { contact } from './test-utils';

const trigger = () => screen.getByRole('button', { name: /Move to/ });

describe('MoveMenu', () => {
  it('offers the other two statuses only', async () => {
    const user = userEvent.setup();
    render(<MoveMenu current="lead" onMove={vi.fn()} />);
    await user.click(trigger());

    const items = await screen.findAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['Active', 'Closed']);
  });

  it.each([
    ['active', ['Lead', 'Closed']],
    ['closed', ['Lead', 'Active']],
  ] as const)('from %s offers %j', async (current, labels) => {
    const user = userEvent.setup();
    render(<MoveMenu current={current} onMove={vi.fn()} />);
    await user.click(trigger());
    expect(
      (await screen.findAllByRole('menuitem')).map((i) => i.textContent),
    ).toEqual(labels);
  });

  it('moves with the keyboard and calls onMove once', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockResolvedValue(ok(contact()));
    render(<MoveMenu current="lead" onMove={onMove} />);

    await user.tab();
    await user.keyboard('{Enter}');
    // Opened with the keyboard: the first item has focus once the menu code lands.
    expect(
      await screen.findByRole('menuitem', { name: 'Active' }),
    ).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onMove).toHaveBeenCalledExactlyOnceWith('closed');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows a pending trigger and ignores it until the move settles', async () => {
    const user = userEvent.setup();
    type Moved = Result<ContactRow>;
    let release: (v: Moved) => void = () => {};
    const onMove = vi.fn(
      () =>
        new Promise<Moved>((r) => {
          release = r;
        }),
    );
    render(<MoveMenu current="lead" onMove={onMove} />);
    await user.click(trigger());
    await user.click(await screen.findByRole('menuitem', { name: 'Active' }));

    const busy = screen.getByRole('button', { name: /Moving/ });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    await user.click(busy);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    release(ok(contact()));
    expect(
      await screen.findByRole('button', { name: 'Move to…' }),
    ).toBeEnabled();
  });

  it('is blocked with a reason a keyboard user can read', async () => {
    const user = userEvent.setup();
    const reason = "Viewers can't edit contacts. Ask an admin.";
    render(
      <MoveMenu current="lead" onMove={vi.fn()} disabledReason={reason} />,
    );

    // The tooltip loads lazily; focusing before it lands would hand focus to a remounted button.
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    await user.tab();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute('aria-disabled', 'true');
    expect(await screen.findByRole('tooltip')).toHaveTextContent(reason);

    await user.keyboard('{Enter}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
