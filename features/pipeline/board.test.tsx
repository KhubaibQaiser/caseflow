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
});
