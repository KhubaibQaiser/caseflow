import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './checkbox';
import { CheckboxGroup } from './checkbox-group';
import { ErrorSummary } from './field';
import { RadioGroup } from './radio-group';
import { Segmented } from './segmented';

const options = [
  { value: 'lead', label: 'Lead' },
  { value: 'active', label: 'Active' },
];

function expectInvalidGroup(group: HTMLElement, id: string, error: string) {
  expect(group).toHaveAttribute('id', id);
  expect(group).toHaveAttribute('aria-invalid', 'true');
  expect(group).toHaveAccessibleDescription(error);
  group.focus();
  expect(group).toHaveFocus();
}

describe('group errors', () => {
  it('wires a RadioGroup error to the group', () => {
    render(
      <RadioGroup
        id="follow-up"
        legend="Follow-up"
        name="followUp"
        options={options}
        error="Choose a follow-up window."
      />,
    );
    expectInvalidGroup(
      screen.getByRole('group', { name: 'Follow-up' }),
      'follow-up',
      'Choose a follow-up window.',
    );
  });

  it('wires a Segmented error to the radiogroup', () => {
    render(
      <Segmented
        id="status"
        label="Status"
        name="status"
        options={options}
        error="Choose a status."
      />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Status' });
    expectInvalidGroup(group, 'status', 'Choose a status.');
    // The halo is a box-shadow, which forced colours drop; keep an outline there.
    expect(group).toHaveClass(
      'forced-colors:aria-invalid:outline-2',
      'forced-colors:aria-invalid:outline-solid',
    );
  });

  it('wires a CheckboxGroup error to the group', () => {
    render(
      <CheckboxGroup
        id="matter-types"
        legend="Matter type"
        error="Pick at least one matter type."
      >
        <Checkbox label="Family" />
      </CheckboxGroup>,
    );
    expectInvalidGroup(
      screen.getByRole('group', { name: 'Matter type' }),
      'matter-types',
      'Pick at least one matter type.',
    );
  });

  it('leaves a valid group unmarked', () => {
    render(
      <CheckboxGroup id="matter-types" legend="Matter type">
        <Checkbox label="Family" />
      </CheckboxGroup>,
    );
    const group = screen.getByRole('group', { name: 'Matter type' });
    expect(group).not.toHaveAttribute('aria-invalid');
    expect(group).not.toHaveAttribute('aria-describedby');
  });

  it('lets an ErrorSummary link move focus to the group', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <ErrorSummary
          errors={[
            { id: 'status', label: 'Status', message: 'Choose a status.' },
          ]}
        />
        <Segmented
          id="status"
          label="Status"
          name="status"
          options={options}
          error="Choose a status."
        />
      </>,
    );

    await user.click(screen.getByRole('link', { name: 'Status' }));
    expect(screen.getByRole('radiogroup', { name: 'Status' })).toHaveFocus();
  });
});
