import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Column } from './column';
import { pipelineRow } from './test-utils';

const rows = Array.from({ length: 50 }, (_, i) => pipelineRow(`r${i}`, 'lead'));
const props = {
  status: 'lead' as const,
  rows,
  matching: 642,
  canMove: true,
  onMove: vi.fn(),
  onLoadMore: vi.fn(),
};

describe('Column', () => {
  it('shows the status, its count and what is left', () => {
    render(<Column {...props} />);
    expect(screen.getByRole('heading', { name: /Lead/ })).toHaveTextContent(
      'Lead642',
    );
    expect(
      screen.getByRole('button', { name: 'Show 50 more · 592 left' }),
    ).toBeInTheDocument();
  });

  it('asks for the next page when the button is pressed', async () => {
    const onLoadMore = vi.fn().mockResolvedValue(true);
    render(<Column {...props} onLoadMore={onLoadMore} />);
    await userEvent.click(screen.getByRole('button', { name: /Show 50 more/ }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('caps the button at what is left', () => {
    render(<Column {...props} matching={60} />);
    expect(
      screen.getByRole('button', { name: 'Show 10 more · 10 left' }),
    ).toBeInTheDocument();
  });

  it('has no button once every row is showing', () => {
    render(<Column {...props} matching={50} />);
    expect(screen.queryByRole('button', { name: /Show/ })).toBeNull();
  });

  it('says so when the column is empty', () => {
    render(<Column {...props} rows={[]} matching={0} />);
    expect(screen.getByText('No Lead contacts.')).toBeInTheDocument();
  });

  it('keeps Retry in the column when more rows fail to load', async () => {
    const onLoadMore = vi.fn().mockResolvedValue(false);
    render(<Column {...props} onLoadMore={onLoadMore} />);
    await userEvent.click(screen.getByRole('button', { name: /Show 50 more/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load more.",
    );
  });
});
