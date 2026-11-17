import { describe, expect, it } from 'vitest';

import { loadListQuery, serializeListQuery } from './list-query';
import { parsePipelineSorts } from './pipeline-sort-schema';

describe('parsePipelineSorts', () => {
  it('reads one param per column and defaults to urgency', () => {
    const q = loadListQuery({ leadSort: 'name', closedSort: 'created' });
    expect(parsePipelineSorts(q)).toEqual({
      lead: 'name',
      active: 'urgency',
      closed: 'created',
    });
  });

  it('ignores invalid values', () => {
    const q = loadListQuery({ leadSort: 'nope', activeSort: ['name'] });
    expect(parsePipelineSorts(q)).toEqual({
      lead: 'urgency',
      active: 'urgency',
      closed: 'urgency',
    });
  });

  it('keeps the params through the list serializer', () => {
    const q = loadListQuery({ activeSort: 'updated' });
    expect(serializeListQuery('/pipeline', q)).toBe(
      '/pipeline?activeSort=updated',
    );
  });
});
