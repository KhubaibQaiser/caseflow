import { describe, expect, it } from 'vitest';

import { emptyReason } from './empty-reason';

describe('emptyReason', () => {
  it.each([
    ['closed', { followUp: 'overdue' }, "Closed contacts can't be overdue."],
    ['closed', { followUp: 'dueToday' }, "Closed contacts can't be due today."],
  ] as const)('%s under %j says why', (status, filters, text) => {
    expect(emptyReason(status, filters)).toBe(text);
  });

  it.each([
    ['lead', { followUp: 'overdue' }],
    ['active', { followUp: 'dueToday' }],
    ['closed', {}],
    ['closed', { followUp: 'next7Days' }],
    ['closed', { q: 'ortega' }],
  ] as const)('%s under %j has no special reason', (status, filters) => {
    expect(emptyReason(status, filters)).toBeUndefined();
  });
});
