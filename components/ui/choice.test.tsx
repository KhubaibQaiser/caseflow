import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RadioGroup } from './radio-group';
import { Segmented } from './segmented';

const options = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed', disabled: true },
];

describe.each([
  ['RadioGroup', 'group'],
  ['Segmented', 'radiogroup'],
] as const)('%s', (kind, role) => {
  const renderChoice = (props: {
    onValueChange?(value: string): void;
    onBlur?(): void;
  }) =>
    kind === 'RadioGroup'
      ? render(
          <RadioGroup
            legend="Status"
            name="status"
            options={options}
            {...props}
          />,
        )
      : render(
          <Segmented
            label="Status"
            name="status"
            options={options}
            {...props}
          />,
        );

  it('reports the clicked value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderChoice({ onValueChange });

    await user.click(screen.getByRole('radio', { name: 'Active' }));
    expect(onValueChange).toHaveBeenCalledWith('active');
    expect(screen.getByRole(role, { name: 'Status' })).toBeInTheDocument();
  });

  it('disables a single option natively', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderChoice({ onValueChange });

    const closed = screen.getByRole('radio', { name: 'Closed' });
    expect(closed).toBeDisabled();
    await user.click(closed);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('passes blur through for touched state', () => {
    const onBlur = vi.fn();
    renderChoice({ onBlur });

    fireEvent.blur(screen.getByRole('radio', { name: 'Lead' }));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

describe('Segmented label', () => {
  it('shows a visible label that names the radiogroup', () => {
    render(
      <Segmented label="Status" name="status" options={options.slice(0, 2)} />,
    );
    const label = screen.getByText('Status');
    expect(label).toBeVisible();
    expect(label).not.toHaveClass('sr-only');
    expect(screen.getByRole('radiogroup', { name: 'Status' })).toHaveAttribute(
      'aria-labelledby',
      label.id,
    );
  });

  it('can hide the label visually and keep the name', () => {
    render(
      <Segmented
        label="Quick views"
        hideLabel
        name="view"
        options={options.slice(0, 2)}
      />,
    );
    expect(screen.getByText('Quick views')).toHaveClass('sr-only');
    expect(
      screen.getByRole('radiogroup', { name: 'Quick views' }),
    ).toBeInTheDocument();
  });
});
