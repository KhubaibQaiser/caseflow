import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SortControl } from './sort-control';

describe('SortControl', () => {
  it('is a plain icon for urgency and a labelled chip for any other sort', async () => {
    const { rerender } = render(
      <SortControl status="lead" sort="urgency" onChange={vi.fn()} />,
    );
    const plain = await screen.findByRole('button', {
      name: 'Sort Lead: Urgency',
    });
    expect(plain).toHaveTextContent('');
    rerender(<SortControl status="lead" sort="name" onChange={vi.fn()} />);
    const chip = await screen.findByRole('button', {
      name: 'Sort Lead: Name A–Z',
    });
    expect(chip).toHaveTextContent('Name A–Z');
  });

  it('opens a radio menu with the current choice checked, and reports a pick', async () => {
    const onChange = vi.fn();
    render(<SortControl status="active" sort="name" onChange={onChange} />);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: /^Sort Active/ }),
    );
    const radios = await screen.findAllByRole('menuitemradio');
    expect(radios.map((r) => r.textContent)).toEqual([
      'UrgencyDefault',
      'Name A–Z',
      'Recently updated',
      'Newest created',
    ]);
    expect(
      screen.getByRole('menuitemradio', { name: 'Name A–Z' }),
    ).toBeChecked();
    expect(
      screen.getByRole('menuitemradio', { name: /Urgency/ }),
    ).not.toBeChecked();
    await user.click(
      screen.getByRole('menuitemradio', { name: 'Recently updated' }),
    );
    expect(onChange).toHaveBeenCalledWith('updated');
  });

  it('opens on a click made before the menu code loads', async () => {
    render(<SortControl status="closed" sort="urgency" onChange={vi.fn()} />);
    // No await before the click: the stand-in is what is on screen.
    await userEvent.click(screen.getByRole('button', { name: /^Sort Closed/ }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
  });
});
