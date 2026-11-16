import { describe, expect, it } from 'vitest';
import { DataError, getPipelineColumn, mapContactRow } from './supabase';

const raw = {
  id: 'c1',
  full_name: 'Ana Ruiz',
  email: null,
  phone: '5125550100',
  matter_type: 'family',
  referral_source: null,
  status: 'active',
  follow_up_on: '2026-11-10',
  created_at: '2026-11-01T10:00:00.123456+00:00',
  updated_at: '2026-11-02T10:00:00+00:00',
  urgency: 'overdue',
  days_overdue: 7,
};

describe('mapContactRow', () => {
  it('maps snake_case to camelCase and keeps the date-only string', () => {
    const r = mapContactRow(raw);
    expect(r.daysOverdue).toBe(7);
    expect(r.followUpOn).toBe('2026-11-10');
    expect(r.fullName).toBe('Ana Ruiz');
  });

  it('throws a typed error, without echoing the row, when invalid', () => {
    const bad = { ...raw, status: 'deal', email: 'secret@example.com' };
    try {
      mapContactRow(bad);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DataError);
      expect((e as Error).message).not.toContain('secret@example.com');
    }
  });
});

describe('getPipelineColumn offsets', () => {
  it.each([-25, 1.5, Number.NaN])('rejects offset %s', async (o) => {
    await expect(getPipelineColumn('lead', {}, o, 25)).rejects.toBeInstanceOf(
      DataError,
    );
  });
});
