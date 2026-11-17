import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { board } from './test-utils';
import { MobileTabs } from './mobile-tabs';

const urgency = {
  lead: 'urgency',
  active: 'urgency',
  closed: 'urgency',
} as const;
const show = (sorts: Parameters<typeof MobileTabs>[0]['sorts']) =>
  render(
    <MobileTabs
      columns={board()}
      value="lead"
      onChange={vi.fn()}
      sorts={sorts}
      onSortChange={vi.fn()}
    />,
  );

describe('MobileTabs sort button', () => {
  it('keeps the chip border and fill for a non-default sort', async () => {
    show({ ...urgency, lead: 'name' });
    const b = await screen.findByRole('button', {
      name: 'Sort Lead: Name A–Z',
    });
    expect(b).toHaveClass('border-accent', 'bg-accent-soft');
    expect(b).not.toHaveClass('border-line');
    expect(screen.getByText('Name A–Z')).toBeInTheDocument();
  });

  it('is a plain bordered button for urgency', async () => {
    show(urgency);
    const b = await screen.findByRole('button', { name: 'Sort Lead: Urgency' });
    expect(b).toHaveClass('border-line');
    expect(b).not.toHaveClass('border-accent');
  });
});
