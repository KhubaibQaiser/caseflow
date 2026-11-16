import {
  createLoader,
  createParser,
  type inferParserType,
  parseAsArrayOf,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server';
import {
  FOLLOW_UP_FILTERS,
  MATTER_TYPES,
  REFERRAL_SOURCES,
  STATUSES,
  type FollowUpFilter,
  type MatterType,
  type ReferralSource,
  type Status,
} from './enums';

export const PAGE_SIZES = [25, 50, 100, 250, 500] as const;
export const DEFAULT_PAGE_SIZE = 250;
export const SORT_KEYS = [
  'follow_up',
  'name',
  'waiting',
  'updated',
  'status',
] as const;

export type Filters = {
  q?: string;
  status?: Status[];
  matterType?: MatterType[];
  referralSource?: ReferralSource[];
  followUp?: FollowUpFilter | 'custom';
  followUpFrom?: string;
  followUpTo?: string;
  createdFrom?: string;
  createdTo?: string;
};

// nuqs's array parser yields [] for all-invalid input; treat that as "not set".
const literalList = <const T extends readonly string[]>(values: T) => {
  const inner = parseAsArrayOf(parseAsStringLiteral(values));
  return createParser<T[number][]>({
    parse: (v) => {
      const r = inner.parse(v);
      return r && r.length > 0 ? r : null;
    },
    serialize: (v) => inner.serialize(v),
  });
};

const isoDate = createParser<string>({
  parse: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null),
  serialize: (v) => v,
});

const page = createParser<number>({
  parse: (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 ? n : null;
  },
  serialize: String,
}).withDefault(1);

export const listQueryParsers = {
  q: parseAsString,
  status: literalList(STATUSES),
  matter: literalList(MATTER_TYPES),
  source: literalList(REFERRAL_SOURCES),
  fu: parseAsStringLiteral([...FOLLOW_UP_FILTERS, 'custom'] as const),
  fuFrom: isoDate,
  fuTo: isoDate,
  createdFrom: isoDate,
  createdTo: isoDate,
  sort: parseAsStringLiteral(SORT_KEYS).withDefault('follow_up'),
  dir: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('asc'),
  page,
  size: parseAsNumberLiteral(PAGE_SIZES).withDefault(DEFAULT_PAGE_SIZE),
};

export const loadListQuery = createLoader(listQueryParsers);
export type ListQuery = inferParserType<typeof listQueryParsers>;

export function toFilters(q: ListQuery): Filters {
  const f: Filters = {};
  if (q.q) f.q = q.q.slice(0, 100);
  if (q.status) f.status = q.status;
  if (q.matter) f.matterType = q.matter;
  if (q.source) f.referralSource = q.source;
  if (q.fu) f.followUp = q.fu;
  if (q.fuFrom) f.followUpFrom = q.fuFrom;
  if (q.fuTo) f.followUpTo = q.fuTo;
  if (q.createdFrom) f.createdFrom = q.createdFrom;
  if (q.createdTo) f.createdTo = q.createdTo;
  return f;
}

// Counts filter groups (status, matter, source, follow-up, created); the search text is not a group.
export function countActiveFilterGroups(f: Filters): number {
  return [
    f.status?.length,
    f.matterType?.length,
    f.referralSource?.length,
    f.followUp || f.followUpFrom || f.followUpTo,
    f.createdFrom || f.createdTo,
  ].filter(Boolean).length;
}

export function clampPage(
  page: number,
  matching: number,
  pageSize: number,
): number {
  const last = Math.max(1, Math.ceil(matching / pageSize));
  return Math.min(Math.max(1, page), last);
}
