import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fail, ok } from '@/lib/contracts/result';
import { FACETS, wrapper } from '@/features/contacts/list/test-utils';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/pipeline',
  useSearchParams: () => new URLSearchParams('fu=overdue'),
}));
vi.mock('@/components/ui/toaster', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { Board } from './board';
import { pipelineRow } from './test-utils';
import type { Columns } from './rows';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
});

const cols = (): Columns => ({
  lead: {
    rows: [pipelineRow('only', 'lead', { fullName: 'Solo Contact' })],
    matching: 120,
    pages: 1,
  },
  active: { rows: [], matching: 0, pages: 1 },
  closed: { rows: [], matching: 0, pages: 1 },
});

const props = (over: Partial<Parameters<typeof Board>[0]> = {}) => ({
  columns: cols(),
  filters: {},
  sorts: { lead: 'urgency', active: 'urgency', closed: 'urgency' } as const,
  facets: FACETS,
  filtersOpen: false,
  onMove: vi.fn().mockResolvedValue(ok(pipelineRow('only', 'active'))),
  onLoadMore: vi.fn().mockResolvedValue(ok({ rows: [], matching: 120 })),
  ...over,
});

describe('Board', () => {
  it('moves focus to the source column heading when its only card leaves', async () => {
    const user = userEvent.setup();
    render(<Board {...props()} />, { wrapper: wrapper() });
    await user.click(screen.getByRole('button', { name: /Move to/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Active' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^Lead/ })).toHaveFocus(),
    );
  });

  it('does not hold focus for a card that cannot appear', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockResolvedValue(ok(pipelineRow('only', 'active')));
    render(<Board {...props({ onMove })} />, { wrapper: wrapper() });
    await user.click(screen.getByRole('button', { name: /Move to/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Closed' }));
    await waitFor(() => expect(onMove).toHaveBeenCalled());
    // A later click elsewhere is not pulled back by a stale target.
    const heading = screen.getByRole('heading', { name: /^Active/ });
    heading.focus();
    await user.click(document.body);
    expect(screen.getByRole('heading', { name: /^Lead/ })).not.toHaveFocus();
  });

  it('sends an expired session from Show 50 more to sign-in, back to this board', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi
      .fn()
      .mockResolvedValue(fail('unauthorized', 'Sign in again.'));
    render(<Board {...props({ onLoadMore })} />, { wrapper: wrapper() });
    await user.click(screen.getByRole('button', { name: /Show 50 more/ }));
    expect(push).toHaveBeenCalledWith(
      '/login?reason=expired&next=' +
        encodeURIComponent('/pipeline?fu=overdue'),
    );
  });

  it('puts the status tabs first on a phone, ahead of search', () => {
    render(<Board {...props()} />, { wrapper: wrapper() });
    const tabs = screen.getByRole('radiogroup', { name: 'Status' });
    const search = screen.getByRole('search');
    expect(
      tabs.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('writes a column pick to its own URL param, and urgency back out of it', async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    render(<Board {...props()} />, { wrapper: wrapper({ onUrlUpdate }) });
    await user.click(
      (
        await screen.findAllByRole('button', { name: 'Sort Lead: Urgency' })
      )[0]!,
    );
    await user.click(
      await screen.findByRole('menuitemradio', { name: 'Name A–Z' }),
    );
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const url = onUrlUpdate.mock.calls.at(-1)![0].searchParams;
    expect(url.get('leadSort')).toBe('name');
    expect(url.get('activeSort')).toBeNull();
  });

  it("asks Show 50 more in the column's sort", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi
      .fn()
      .mockResolvedValue(ok({ rows: [], matching: 120 }));
    const sorts = {
      lead: 'updated',
      active: 'urgency',
      closed: 'urgency',
    } as const;
    render(<Board {...props({ onLoadMore, sorts })} />, { wrapper: wrapper() });
    await user.click(screen.getByRole('button', { name: /Show 50 more/ }));
    expect(onLoadMore).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'lead', sort: 'updated', page: 1 }),
    );
  });

  it("a new sort replaces only that column with the server's first page", () => {
    const active = pipelineRow('act', 'active', { fullName: 'Active Person' });
    const base = {
      ...cols(),
      active: { rows: [active], matching: 1, pages: 1 },
    };
    const { rerender } = render(<Board {...props({ columns: base })} />, {
      wrapper: wrapper(),
    });
    const next = {
      ...base,
      lead: {
        rows: [pipelineRow('z', 'lead', { fullName: 'Zed First' })],
        matching: 120,
        pages: 1,
      },
      active: { rows: [], matching: 0, pages: 1 },
    };
    rerender(
      <Board
        {...props({
          columns: next,
          sorts: { lead: 'name', active: 'urgency', closed: 'urgency' },
        })}
      />,
    );
    expect(screen.getByText('Zed First')).toBeInTheDocument();
    expect(screen.queryByText('Solo Contact')).not.toBeInTheDocument();
    // Active kept its rows: its sort did not change.
    expect(screen.getByText('Active Person')).toBeInTheDocument();
  });
});
