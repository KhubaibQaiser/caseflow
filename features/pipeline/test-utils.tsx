import type { ContactRow } from '@/lib/contracts/contact';
import type { Status } from '@/lib/contracts/enums';

import type { Columns, PipelineRow } from './rows';

export function pipelineRow(
  id: string,
  status: Status,
  over: Partial<ContactRow> = {},
): PipelineRow {
  return {
    id,
    fullName: `Person ${id}`,
    email: null,
    phone: '(512) 555-0148',
    matterType: 'family',
    referralSource: null,
    status,
    followUpOn: '2026-11-25',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-02T10:00:00.000Z',
    urgency: 'later',
    daysOverdue: null,
    open: { tone: 'later', text: 'Wed, Nov 25', rank: 2 },
    closed: { tone: 'muted', text: 'Wed, Nov 25', rank: 3 },
    ...over,
  };
}

export const board = (): Columns => ({
  lead: {
    rows: [
      pipelineRow('a', 'lead', { fullName: 'Marisol Ortega' }),
      pipelineRow('b', 'lead'),
    ],
    matching: 2,
  },
  active: { rows: [pipelineRow('c', 'active')], matching: 1 },
  closed: { rows: [], matching: 0 },
});
