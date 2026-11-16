import { describe, expect, it } from 'vitest';
import {
  clampPage,
  countActiveFilterGroups,
  loadListQuery,
  toFilters,
} from './list-query';

describe('list query', () => {
  it('falls back on invalid params', () => {
    const q = loadListQuery({
      status: 'foo',
      size: '7',
      page: '-2',
      sort: 'x',
    });
    expect(q).toMatchObject({
      status: null,
      size: 250,
      page: 1,
      sort: 'follow_up',
      dir: 'asc',
    });
  });

  it('parses valid params and maps to filters', () => {
    const q = loadListQuery({
      status: 'lead,active',
      matter: 'family',
      fu: 'overdue',
      q: 'ana',
      size: '50',
      page: '3',
    });
    expect(q).toMatchObject({ size: 50, page: 3 });
    expect(toFilters(q)).toEqual({
      q: 'ana',
      status: ['lead', 'active'],
      matterType: ['family'],
      followUp: 'overdue',
    });
  });

  it('clampPage', () => {
    expect(clampPage(5, 30, 25)).toBe(2);
    expect(clampPage(3, 0, 25)).toBe(1);
    expect(clampPage(1, 30, 25)).toBe(1);
  });

  it('countActiveFilterGroups ignores q', () => {
    expect(countActiveFilterGroups({ q: 'x', status: ['lead'] })).toBe(1);
    expect(
      countActiveFilterGroups({
        followUp: 'custom',
        followUpFrom: '2026-01-01',
        followUpTo: '2026-02-01',
      }),
    ).toBe(1);
    expect(
      countActiveFilterGroups({
        createdFrom: '2026-01-01',
        matterType: ['family'],
      }),
    ).toBe(2);
    expect(countActiveFilterGroups({})).toBe(0);
  });
});
