import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContactRow } from '@/lib/contracts/contact';
import { ROLE_PERMISSIONS } from '@/lib/contracts/permissions';

const getPipelineColumn = vi.fn();
vi.mock('@/lib/data', () => ({
  getPipelineColumn: (...a: unknown[]) => getPipelineColumn(...a),
}));
vi.mock('@/lib/dates/server', () => ({
  getRequestTimeZone: async () => 'UTC',
}));
let permissions: string[] = [...ROLE_PERMISSIONS.admin];
vi.mock('@/lib/auth/viewer', () => ({
  getViewer: async () => ({ displayName: 'A', role: 'admin', permissions }),
}));

const { loadMoreColumnAction } = await import('./actions');

const row = (id: string): ContactRow => ({
  id,
  fullName: id,
  email: null,
  phone: null,
  matterType: 'family',
  referralSource: null,
  status: 'lead',
  followUpOn: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
  urgency: 'none',
  daysOverdue: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  permissions = [...ROLE_PERMISSIONS.admin];
  getPipelineColumn.mockImplementation(async (_s, _f, offset: number) => ({
    rows: [row(`r${offset}`)],
    matching: 642,
  }));
});

describe('loadMoreColumnAction', () => {
  it('asks for whole pages: the one wanted and the one before it', async () => {
    const r = await loadMoreColumnAction({
      status: 'lead',
      filters: {},
      page: 2,
    });
    expect(getPipelineColumn.mock.calls.map((c) => c[2])).toEqual([50, 100]);
    expect(r.ok && r.data.rows.map((x) => x.id)).toEqual(['r50', 'r100']);
    expect(r.ok && r.data.matching).toBe(642);
  });

  it.each([
    [{ status: 'lead', filters: {}, page: 0 }],
    [{ status: 'won', filters: {}, page: 1 }],
    [{ status: 'lead', filters: { followUp: 'custom' }, page: 1 }],
    ['nope'],
  ])('rejects a bad request %j', async (raw) => {
    const r = await loadMoreColumnAction(raw);
    expect(r.ok).toBe(false);
    expect(getPipelineColumn).not.toHaveBeenCalled();
  });

  it('is closed to a role that cannot read', async () => {
    permissions = [];
    const r = await loadMoreColumnAction({
      status: 'lead',
      filters: {},
      page: 1,
    });
    expect(!r.ok && r.error.code).toBe('forbidden');
  });
});
