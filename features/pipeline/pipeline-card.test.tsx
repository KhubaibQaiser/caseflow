import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ok } from '@/lib/contracts/result';

import { PipelineCard } from './pipeline-card';
import { pipelineRow } from './test-utils';

describe('PipelineCard', () => {
  it('links the name and shows urgency, matter and phone', () => {
    render(<PipelineCard row={pipelineRow('a', 'lead')} onMove={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Person a' })).toHaveAttribute(
      'href',
      '/contacts/a',
    );
    expect(screen.getByText('Wed, Nov 25')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();
  });

  it('calls onMove once for a double-click on a move item', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockResolvedValue(ok(pipelineRow('a', 'active')));
    render(<PipelineCard row={pipelineRow('a', 'lead')} onMove={onMove} />);
    await user.click(screen.getByRole('button', { name: /Move to/ }));
    await user.dblClick(await screen.findByRole('menuitem', { name: 'Active' }));
    expect(onMove).toHaveBeenCalledExactlyOnceWith('a', 'active');
  });

  it('blocks Move for a viewer and says why', async () => {
    const onMove = vi.fn();
    render(
      <PipelineCard
        row={pipelineRow('a', 'lead')}
        onMove={onMove}
        disabledReason="Viewers can't move contacts."
      />,
    );
    const button = screen.getByRole('button', { name: /Move to/ });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(button);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onMove).not.toHaveBeenCalled();
  });
});
