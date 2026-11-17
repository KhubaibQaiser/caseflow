import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

  it('announces a menu button before the menu code loads', () => {
    render(<MoveMenu current="lead" onMove={vi.fn()} />);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('clears pending when onMove rejects, with nothing unhandled', async () => {
    const user = userEvent.setup();
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const onMove = vi.fn().mockRejectedValue(new Error('network'));
    render(<MoveMenu current="lead" onMove={onMove} />);
    await user.click(trigger());
    await user.click(await screen.findByRole('menuitem', { name: 'Active' }));

    expect(
      await screen.findByRole('button', { name: 'Move to…' }),
    ).toBeEnabled();
    await new Promise((r) => setTimeout(r, 0));
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('stays usable after a failed Result', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'server', message: 'x' },
    });
    render(<MoveMenu current="lead" onMove={onMove} />);
    await user.click(trigger());
    await user.click(await screen.findByRole('menuitem', { name: 'Active' }));
    expect(
      await screen.findByRole('button', { name: 'Move to…' }),
    ).toBeEnabled();

    await user.click(trigger());
    expect(
      await screen.findByRole('menuitem', { name: 'Closed' }),
    ).toBeVisible();
  });

  it('returns focus to the trigger after a select and after Escape', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockResolvedValue(ok(contact()));
    render(<MoveMenu current="lead" onMove={onMove} />);
    await user.click(trigger());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();

    await user.click(trigger());
    await user.click(await screen.findByRole('menuitem', { name: 'Active' }));
    expect(
      await screen.findByRole('button', { name: 'Move to…' }),
    ).toHaveFocus();
  });

  it('opens with Space', async () => {
    const user = userEvent.setup();
    render(<MoveMenu current="lead" onMove={vi.fn()} />);
    await user.tab();
    await user.keyboard(' ');
    expect(
      await screen.findByRole('menuitem', { name: 'Active' }),
    ).toHaveFocus();
  });

  it('calls onMove once for two selects in one tick', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn(() => new Promise<Result<ContactRow>>(() => {}));
    render(<MoveMenu current="lead" onMove={onMove} />);
    await user.click(trigger());
    const items = await screen.findAllByRole('menuitem');
    act(() => {
      items[0]!.click();
      items[1]!.click();
    });
    expect(onMove).toHaveBeenCalledTimes(1);
  });
});
