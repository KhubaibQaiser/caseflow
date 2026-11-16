import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Chip } from './chip';

describe('Chip', () => {
  it('names its remove button after the filter', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<Chip label="Status" value="Lead, Active" onRemove={onRemove} />);

    await user.click(
      screen.getByRole('button', { name: 'Remove Status filter' }),
    );
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
