import type { ContactRow } from '@/lib/contracts/contact';
import {
  MATTER_TYPE_LABEL,
  REFERRAL_SOURCE_LABEL,
} from '@/lib/contracts/enums';
import type { ListQuery } from '@/lib/contracts/list-query';

export type SortKey = ListQuery['sort'];
export type SortDir = ListQuery['dir'];

export const matterLabel = (r: ContactRow) => MATTER_TYPE_LABEL[r.matterType];
export const sourceLabel = (r: ContactRow) =>
  r.referralSource ? REFERRAL_SOURCE_LABEL[r.referralSource] : 'Not set';

// `tel:` takes digits and a leading +; the visible number keeps its formatting.
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/**
 * Sorts the table headers and the mobile menu offer, in one order.
 * `waiting` sorts by created date, so ascending (oldest first) shows the most days waiting first.
 */
export const SORT_OPTIONS: readonly {
  key: Exclude<SortKey, 'updated'>;
  label: string;
  asc: string;
  desc: string;
}[] = [
  {
    key: 'follow_up',
    label: 'Follow-up',
    asc: 'soonest first',
    desc: 'latest first',
  },
  { key: 'name', label: 'Name', asc: 'A to Z', desc: 'Z to A' },
  {
    key: 'status',
    label: 'Status',
    asc: 'Lead to Closed',
    desc: 'Closed to Lead',
  },
  {
    key: 'waiting',
    label: 'Waiting',
    asc: 'longest first',
    desc: 'newest first',
  },
];

/** Clicking the sorted column flips it; any other column starts ascending. */
export const nextSort = (
  current: { sort: SortKey; dir: SortDir },
  key: SortKey,
): { sort: SortKey; dir: SortDir } =>
  current.sort === key
    ? { sort: key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
    : { sort: key, dir: 'asc' };

/** The mobile Sort button: short visible text, full name for screen readers. */
export function sortLabel(sort: SortKey, dir: SortDir) {
  const o = SORT_OPTIONS.find((x) => x.key === sort);
  // `updated` has no header, so it reads as a plain "Sort".
  if (!o) return { text: 'Sort', name: 'Sort' };
  return {
    text: `Sort: ${o.label}`,
    name: `Sort: ${o.label}, ${dir === 'asc' ? o.asc : o.desc}`,
  };
}
