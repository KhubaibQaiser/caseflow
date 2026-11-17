import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toast } from '@/components/ui/toaster';
import { fail, ok } from '@/lib/contracts/result';
import type { Result } from '@/lib/contracts/result';
import type { ContactRow } from '@/lib/contracts/contact';

import { board, pipelineRow } from './test-utils';
import { useBoardMoves } from './use-board-moves';

vi.mock('@/components/ui/toaster', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

function deferred() {
  let resolve: (r: Result<ContactRow>) => void = () => {};
  const promise = new Promise<Result<ContactRow>>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => vi.clearAllMocks());

describe('useBoardMoves', () => {
  it('moves the card and the counts before the server answers', async () => {
    const d = deferred();
    const { result } = renderHook(() =>
      useBoardMoves(board(), () => d.promise),
    );

    let settled: Promise<unknown> = Promise.resolve();
    act(() => {
      settled = result.current.move('a', 'active');
    });

    const c = result.current.columns;
    expect(ids(c.lead.rows)).toEqual(['b']);
    expect(ids(c.active.rows)).toContain('a');
    expect([c.lead.matching, c.active.matching]).toEqual([1, 2]);
    expect(c.active.rows.find((r) => r.id === 'a')?.status).toBe('active');
    expect(toast.success).not.toHaveBeenCalled();

    await act(async () => {
      d.resolve(ok(pipelineRow('a', 'active')));
      await settled;
    });
    // The move stays after the server confirms it.
    expect(ids(result.current.columns.active.rows)).toContain('a');
    expect(toast.success).toHaveBeenCalledWith('Marisol Ortega moved to Active.');
  });

  it('puts the card where urgency sorts it, not on top', async () => {
    const cols = board();
    cols.active.rows = [
      pipelineRow('o', 'active', {
        open: { tone: 'overdue', text: 'Overdue · 2d', rank: 0 },
      }),
      pipelineRow('z', 'active', {
        followUpOn: '2026-12-30',
        open: { tone: 'later', text: 'Wed, Dec 30', rank: 2 },
      }),
    ];
    cols.active.matching = 2;
    const { result } = renderHook(() =>
      useBoardMoves(cols, () => Promise.resolve(ok(pipelineRow('a', 'active')))),
    );
    await act(async () => {
      await result.current.move('a', 'active');
    });
    expect(ids(result.current.columns.active.rows)).toEqual(['o', 'a', 'z']);
  });

  it('shows a moved card with the Closed (muted) follow-up', async () => {
    const d = deferred();
    const { result } = renderHook(() =>
      useBoardMoves(board(), () => d.promise),
    );
    act(() => void result.current.move('a', 'closed'));
    expect(result.current.columns.closed.rows[0]?.closed.tone).toBe('muted');
    await act(async () => d.resolve(ok(pipelineRow('a', 'closed'))));
  });

  it('puts everything back when the server fails, and offers Retry', async () => {
    const d = deferred();
    const onMove = vi.fn(() => d.promise);
    const { result } = renderHook(() => useBoardMoves(board(), onMove));

    let settled: Promise<unknown> = Promise.resolve();
    act(() => {
      settled = result.current.move('a', 'active');
    });
    expect(ids(result.current.columns.lead.rows)).toEqual(['b']);

    await act(async () => {
      d.resolve(fail('server', 'boom'));
      await settled;
    });
    const c = result.current.columns;
    expect(ids(c.lead.rows)).toEqual(['a', 'b']);
    expect([c.lead.matching, c.active.matching]).toEqual([2, 1]);
    expect(toast.error).toHaveBeenCalledWith(
      'Move failed. Retry.',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Retry' }),
      }),
    );
  });

  it('rolls back when the request itself rejects', async () => {
    const { result } = renderHook(() =>
      useBoardMoves(board(), () => Promise.reject(new Error('offline'))),
    );
    await act(async () => {
      await result.current.move('a', 'active');
    });
    expect(ids(result.current.columns.lead.rows)).toEqual(['a', 'b']);
    expect(toast.error).toHaveBeenCalledWith(
      'Move failed. Retry.',
      expect.anything(),
    );
  });

  it('names the permission when the role changed mid-session', async () => {
    const { result } = renderHook(() =>
      useBoardMoves(board(), () =>
        Promise.resolve(fail('forbidden', "Viewers can't move contacts.")),
      ),
    );
    await act(async () => {
      await result.current.move('a', 'active');
    });
    expect(ids(result.current.columns.lead.rows)).toEqual(['a', 'b']);
    expect(toast.error).toHaveBeenCalledWith(
      "You don't have permission to move contacts.",
    );
  });

  it('retries the same move from the toast', async () => {
    const onMove = vi
      .fn()
      .mockResolvedValueOnce(fail('server', 'boom'))
      .mockResolvedValueOnce(ok(pipelineRow('a', 'active')));
    const { result } = renderHook(() => useBoardMoves(board(), onMove));
    await act(async () => {
      await result.current.move('a', 'active');
    });
    const options = vi.mocked(toast.error).mock.calls[0]?.[1];
    await act(async () => {
      options?.action && 'onClick' in options.action
        ? options.action.onClick({} as never)
        : undefined;
    });
    expect(onMove).toHaveBeenCalledTimes(2);
    expect(ids(result.current.columns.active.rows)).toContain('a');
  });

  it('appends loaded rows without repeating one that is already there', () => {
    const { result } = renderHook(() =>
      useBoardMoves(board(), () => Promise.reject(new Error('unused'))),
    );
    act(() =>
      result.current.append('lead', [pipelineRow('b', 'lead'), pipelineRow('n', 'lead')], 3),
    );
    expect(ids(result.current.columns.lead.rows)).toEqual(['a', 'b', 'n']);
    expect(result.current.columns.lead.matching).toBe(3);
  });
});
