import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusPill, UrgencyPill } from './pill';

describe('pills', () => {
  it('outlines Lead and keeps a transparent border on the others', () => {
    render(
      <>
        <StatusPill status="lead" />
        <StatusPill status="active" />
        <UrgencyPill tone="overdue" text="Overdue · 3d" />
      </>,
    );

    const lead = screen.getByText('Lead');
    expect(lead).toHaveClass('border', 'border-lead-border', 'px-2');
    expect(lead).not.toHaveClass('border-transparent');
    for (const text of ['Active', 'Overdue · 3d'])
      expect(screen.getByText(text)).toHaveClass(
        'border',
        'border-transparent',
        'px-2',
      );
  });
});
