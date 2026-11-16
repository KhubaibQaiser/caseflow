import { expect, it } from 'vitest';
import { urgencyOf } from './urgency';

const T = '2026-11-17';
it.each([
  ['lead', '2026-11-14', 'overdue', 3],
  ['active', T, 'today', null],
  ['lead', '2026-11-20', 'later', null],
  ['active', null, 'none', null],
  ['closed', '2026-11-01', 'later', null],
  ['closed', T, 'later', null],
] as const)('%s %s -> %s', (status, fu, urgency, daysOverdue) =>
  expect(urgencyOf(status, fu, T)).toEqual({ urgency, daysOverdue }),
);
