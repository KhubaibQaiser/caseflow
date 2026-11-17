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
  sort: 'urgency' as const,
  onSortChange: vi.fn(),
  onMove: vi.fn(),
  onLoadMore: vi.fn(),
};

describe('Column', () => {
  it('shows the status, its count and what is left', () => {
    render(<Column {...props} />);
    expect(screen.getByRole('heading', { name: /Lead/ })).toHaveTextContent(
      'Lead 642 contacts',
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

describe('Column layout', () => {
  it('pins Show more and its failure outside the scrolling cards', async () => {
    const onLoadMore = vi.fn().mockResolvedValue(false);
    render(<Column {...props} onLoadMore={onLoadMore} />);
    const more = screen.getByRole('button', { name: /Show 50 more/ });
    expect(more.closest('[data-scroller]')).toBeNull();
    await userEvent.click(more);
    expect(
      (await screen.findByRole('alert')).closest('[data-scroller]'),
    ).toBeNull();
    expect(
      screen
        .getByRole('list', { name: 'Lead contacts' })
        .closest('[data-scroller]'),
    ).not.toBeNull();
  });

  it('keeps the heading for the tabs on a phone: named, but only read out', () => {
    render(<Column {...props} />);
    const h = screen.getByRole('heading', { name: /Lead/ });
    expect(h.parentElement).toHaveClass('max-md:sr-only');
    expect(screen.getByRole('region', { name: /Lead/ })).toBeInTheDocument();
  });
});

describe('Column empty reason', () => {
  it('says why when a filter explains the empty column', () => {
    render(
      <Column
        {...props}
        status="closed"
        rows={[]}
        matching={0}
        emptyReason="Closed contacts can't be overdue."
      />,
    );
    expect(screen.getByText('No Closed contacts.')).toBeInTheDocument();
    expect(
      screen.getByText("Closed contacts can't be overdue."),
    ).toBeInTheDocument();
  });
});
