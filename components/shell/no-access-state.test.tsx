import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NoAccessState } from './no-access-state';

describe('NoAccessState', () => {
  it('says why and offers Sign out', async () => {
    const signOut = vi.fn(async () => {});
    render(<NoAccessState signOut={signOut} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'No access.' }),
    ).toHaveFocus();
    expect(
      screen.getByText("Your account isn't set up yet. Ask an admin."),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(signOut).toHaveBeenCalled();
  });
});
