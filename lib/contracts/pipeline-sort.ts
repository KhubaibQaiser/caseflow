import type { Status } from './enums';

/** How one pipeline column is ordered. Urgency is the default and stays out of the URL. */
export const PIPELINE_SORTS = [
  'urgency',
  'name',
  'updated',
  'created',
] as const;
export type PipelineSort = (typeof PIPELINE_SORTS)[number];
export type PipelineSorts = Record<Status, PipelineSort>;

export const DEFAULT_PIPELINE_SORT: PipelineSort = 'urgency';

export const PIPELINE_SORT_LABEL: Record<PipelineSort, string> = {
  urgency: 'Urgency',
  name: 'Name A–Z',
  updated: 'Recently updated',
  created: 'Newest created',
};

/** The search_contacts sort and direction behind each choice (`waiting` is created_at). */
export const PIPELINE_SORT_RPC: Record<
  PipelineSort,
  { sort: 'follow_up' | 'name' | 'updated' | 'waiting'; dir: 'asc' | 'desc' }
> = {
  urgency: { sort: 'follow_up', dir: 'asc' },
  name: { sort: 'name', dir: 'asc' },
  updated: { sort: 'updated', dir: 'desc' },
  created: { sort: 'waiting', dir: 'desc' },
};

/** The URL param that holds each column's sort. */
export const PIPELINE_SORT_PARAM = {
  lead: 'leadSort',
  active: 'activeSort',
  closed: 'closedSort',
} as const satisfies Record<Status, string>;
