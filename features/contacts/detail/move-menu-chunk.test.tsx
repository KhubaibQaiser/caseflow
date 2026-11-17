import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { MoveMenu } from './move-menu';

// Counts evaluations of the popup chunk; it fails while `down` (offline, stale deploy).
const chunk = vi.hoisted(() => ({ loads: 0, down: false }));
vi.mock('./move-menu-popup', async (importOriginal) => {
  chunk.loads += 1;
  if (chunk.down) throw new Error('Failed to fetch chunk');
  return importOriginal();
});

const trigger = () => screen.getByRole('button', { name: /Move to/ });

// Order matters: this must run before anything loads the chunk.
it('does not preload the menu code while blocked', async () => {
  const user = userEvent.setup();
  render(
    <MoveMenu
      current="lead"
      onMove={vi.fn()}
      disabledReason="Viewers can't edit."
    />,
  );
  await user.hover(trigger());
  await user.tab();
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  expect(chunk.loads).toBe(0);
});

it('keeps the trigger when the menu chunk fails, and a later click retries', async () => {
  const user = userEvent.setup();
  chunk.down = true;
  render(<MoveMenu current="lead" onMove={vi.fn()} />);
  await user.click(trigger());
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(trigger()).not.toHaveAttribute('aria-busy');

  chunk.down = false;
  await user.click(trigger());
  expect(await screen.findByRole('menuitem', { name: 'Active' })).toBeVisible();
});
