import { describe, expect, it } from 'vitest';

import { appendRows, applyMove, hasMore } from './rows';
import { board, pipelineRow } from './test-utils';

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
const NOW = '2026-11-17T12:00:00.000Z';

describe('appendRows', () => {
  it('counts the page, keeps urgency order and recovers a row a move pushed up a page', () => {
    // b was pulled from page 2 into page 1 when a card left, so the client never saw it.
    const cols = board();
    cols.lead.rows = [
      pipelineRow('a', 'lead', { followUpOn: '2026-11-20' }),
      pipelineRow('c', 'lead', { followUpOn: '2026-11-28' }),
    ];
    const next = appendRows(
      cols,
      'lead',
      [
        pipelineRow('b', 'lead', { followUpOn: '2026-11-24' }),
        pipelineRow('c', 'lead', { followUpOn: '2026-11-28' }),
        pipelineRow('d', 'lead', { followUpOn: '2026-12-02' }),
      ],
      4,
    );
    expect(ids(next.lead.rows)).toEqual(['a', 'b', 'c', 'd']);
    expect(next.lead.pages).toBe(2);
  });

  it('drops a row that has since moved to another column', () => {
    const next = appendRows(board(), 'lead', [pipelineRow('c', 'lead')], 3);
    expect(ids(next.lead.rows)).toEqual(['a', 'b']);
  });
});

describe('applyMove', () => {
  it('counts a card that sorts beyond the loaded rows without showing it, so offsets stay honest', () => {
    const cols = board();
    cols.closed = {
      rows: [pipelineRow('z', 'closed', { followUpOn: '2026-10-01' })],
      matching: 300,
      pages: 1,
    };
    const next = applyMove(cols, 'a', 'closed', NOW);
    expect(next.closed.matching).toBe(301);
    expect(ids(next.closed.rows)).toEqual(['z']);
  });

  it('is idempotent and ignores a move to the same column', () => {
    const once = applyMove(board(), 'a', 'active', NOW);
    expect(applyMove(once, 'a', 'active', NOW)).toBe(once);
    expect(applyMove(board(), 'a', 'lead', NOW)).toEqual(board());
  });
});

describe('hasMore', () => {
  it('is decided by the rows still missing', () => {
    const c = { rows: [pipelineRow('a', 'lead')], matching: 120, pages: 1 };
    expect(hasMore(c)).toBe(true);
    expect(hasMore({ ...c, matching: 1 })).toBe(false);
  });

  it('still offers a page when moves left rows behind the last one fetched', () => {
    // 55 in the column, page 1 fetched (50 rows), then 6 cards moved out: 49 match, 5 slid up a page.
    const rows = Array.from({ length: 44 }, (_, i) =>
      pipelineRow(`r${i}`, 'lead'),
    );
    expect(hasMore({ rows, matching: 49, pages: 1 })).toBe(true);
  });
});

describe('urgency ties', () => {
  it('compares updated time as an instant, not as text', () => {
    const cols = board();
    // 14:00Z written with an offset sorts as text after 12:00Z, but it is the later instant.
    cols.active.rows = [
      pipelineRow('later', 'active', {
        updatedAt: '2026-11-17T09:00:00-05:00',
      }),
    ];
    const next = applyMove(cols, 'a', 'active', '2026-11-17T12:00:00.000Z');
    expect(ids(next.active.rows)).toEqual(['later', 'a']);
  });
});
