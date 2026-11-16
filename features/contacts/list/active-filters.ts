import {
  MATTER_TYPE_LABEL,
  REFERRAL_SOURCE_LABEL,
  STATUS_LABEL,
} from '@/lib/contracts/enums';
import type { ListQuery } from '@/lib/contracts/list-query';

import type { ListQueryPatch } from '../url-state';

export type ActiveFilter = {
  key: string;
  label: string;
  value: string;
  clear: ListQueryPatch;
};

export const FOLLOW_UP_LABEL = {
  overdue: 'Overdue',
  dueToday: 'Due today',
  next7Days: 'Next 7 days',
  none: 'No follow-up',
} as const;

// Always with the year: a chip has no "today" to drop it against.
// Intl, not date-fns: this runs in the browser and the bundle is budgeted.
const DAY = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const day = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return DAY.format(Date.UTC(y!, m! - 1, dd!));
};
function range(from: string | null, to: string | null) {
  if (from && to) return from === to ? day(from) : `${day(from)} – ${day(to)}`;
  if (from) return `From ${day(from)}`;
  return to ? `Until ${day(to)}` : '';
}

/** Applied filter groups in panel order. Search is not a group, so it is not here. */
export function activeFilters(q: ListQuery): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  const list = <K extends string>(labels: Record<K, string>, v: K[]) =>
    v.map((k) => labels[k]).join(', ');
  if (q.status)
    out.push({
      key: 'status',
      label: 'Status',
      value: list(STATUS_LABEL, q.status),
      clear: { status: null },
    });
  if (q.fu) {
    const value =
      q.fu === 'custom' ? range(q.fuFrom, q.fuTo) : FOLLOW_UP_LABEL[q.fu];
    if (value)
      out.push({
        key: 'fu',
        label: 'Follow-up',
        value,
        clear: { fu: null, fuFrom: null, fuTo: null },
      });
  }
  if (q.matter)
    out.push({
      key: 'matter',
      label: 'Matter',
      value: list(MATTER_TYPE_LABEL, q.matter),
      clear: { matter: null },
    });
  if (q.source)
    out.push({
      key: 'source',
      label: 'Source',
      value: list(REFERRAL_SOURCE_LABEL, q.source),
      clear: { source: null },
    });
  if (q.createdFrom || q.createdTo)
    out.push({
      key: 'created',
      label: 'Created',
      value: range(q.createdFrom, q.createdTo),
      clear: { createdFrom: null, createdTo: null },
    });
  return out;
}

export const CLEAR_ALL: ListQueryPatch = {
  q: null,
  status: null,
  matter: null,
  source: null,
  fu: null,
  fuFrom: null,
  fuTo: null,
  createdFrom: null,
  createdTo: null,
};
