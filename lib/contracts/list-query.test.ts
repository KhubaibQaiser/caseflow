import { describe, expect, it } from 'vitest';
import {
  clampPage,
  countActiveFilterGroups,
  FiltersSchema,
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

  it('toFilters output parses with FiltersSchema', () => {
    const q = loadListQuery({
      q: `  ${'a'.repeat(150)}`,
      status: 'lead',
      source: 'past_client',
      fu: 'custom',
      fuFrom: '2026-11-01',
      fuTo: '2026-11-30',
      createdFrom: '2026-01-01',
      createdTo: '2026-12-31',
    });
    const f = toFilters(q);
    expect(FiltersSchema.parse(f)).toEqual(f);
    expect(f.q).toBe('a'.repeat(100));
    expect(toFilters(loadListQuery({ q: '   ' })).q).toBeUndefined();
  });

  it('FiltersSchema rejects bad values', () => {
    expect(FiltersSchema.safeParse({ status: ['open'] }).success).toBe(false);
    expect(FiltersSchema.safeParse({ followUp: 'later' }).success).toBe(false);
    expect(FiltersSchema.safeParse({ createdFrom: '11/16/2026' }).success).toBe(
      false,
    );
    expect(FiltersSchema.safeParse({ q: 'a'.repeat(101) }).success).toBe(false);
    expect(FiltersSchema.parse({ q: '  ana  ' })).toEqual({ q: 'ana' });
  });
});
