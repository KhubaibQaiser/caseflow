import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Segmented } from './segmented';

describe('Segmented', () => {
  it('outlines the checked segment so it survives low contrast and forced colours', () => {
    render(
      <Segmented
        label="Status"
        name="status"
        defaultValue="active"
        options={[
          { value: 'lead', label: 'Lead' },
          { value: 'active', label: 'Active' },
        ]}
      />,
    );

    expect(screen.getByRole('radiogroup', { name: 'Status' })).toBeVisible();
    const checked = screen.getByRole('radio', { name: 'Active' });
    expect(checked).toBeChecked();
    const segment = checked.closest('label');
    expect(segment).toHaveClass('border', 'border-transparent');
    expect(segment).toHaveClass('has-checked:border-ink-2');
  });
});
