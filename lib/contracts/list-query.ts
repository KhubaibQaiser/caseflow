import {
  createLoader,
  createParser,
  type LoaderInput,
  type inferParserType,
  parseAsArrayOf,
  parseAsNumberLiteral,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server';
import { z } from 'zod';
import {
  FOLLOW_UP_FILTERS,
  MATTER_TYPES,
  REFERRAL_SOURCES,
  STATUSES,
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

const date = z.iso.date();
const FOLLOW_UP_VALUES = [...FOLLOW_UP_FILTERS, 'custom'] as const;

export const FiltersSchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    status: z.array(z.enum(STATUSES)).optional(),
    matterType: z.array(z.enum(MATTER_TYPES)).optional(),
    referralSource: z.array(z.enum(REFERRAL_SOURCES)).optional(),
    followUp: z.enum(FOLLOW_UP_VALUES).optional(),
    followUpFrom: date.optional(),
    followUpTo: date.optional(),
    createdFrom: date.optional(),
    createdTo: date.optional(),
  })
  .superRefine((f, ctx) => {
    const bad = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    const custom = f.followUp === 'custom';
    if (!custom && (f.followUpFrom || f.followUpTo))
      bad('followUp', 'Follow-up dates need followUp "custom"');
    if (custom && !f.followUpFrom && !f.followUpTo)
      bad('followUp', 'Custom follow-up needs a from or to date');
    if (f.followUpFrom && f.followUpTo && f.followUpFrom > f.followUpTo)
      bad('followUpTo', 'Follow-up "to" is before "from"');
    if (f.createdFrom && f.createdTo && f.createdFrom > f.createdTo)
      bad('createdTo', 'Created "to" is before "from"');
  });
export type Filters = z.infer<typeof FiltersSchema>;

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
  parse: (v) => (date.safeParse(v).success ? v : null),
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
  fu: parseAsStringLiteral(FOLLOW_UP_VALUES),
  fuFrom: isoDate,
  fuTo: isoDate,
  createdFrom: isoDate,
  createdTo: isoDate,
  sort: parseAsStringLiteral(SORT_KEYS).withDefault('follow_up'),
  dir: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('asc'),
  page,
  size: parseAsNumberLiteral(PAGE_SIZES).withDefault(DEFAULT_PAGE_SIZE),
};

const load = createLoader(listQueryParsers);
export type ListQuery = inferParserType<typeof listQueryParsers>;

// Invalid combinations fall back like any other bad param: dates without
// 'custom' go, a reversed range goes, and 'custom' with no bound goes.
function normalize(q: ListQuery): ListQuery {
  const n = { ...q };
  if (n.fu !== 'custom') n.fuFrom = n.fuTo = null;
  if (n.fuFrom && n.fuTo && n.fuFrom > n.fuTo) n.fuFrom = n.fuTo = null;
  if (n.fu === 'custom' && !n.fuFrom && !n.fuTo) n.fu = null;
  if (n.createdFrom && n.createdTo && n.createdFrom > n.createdTo)
    n.createdFrom = n.createdTo = null;
  return n;
}

export const loadListQuery = (input: LoaderInput): ListQuery =>
  normalize(load(input));

export function toFilters(input: ListQuery): Filters {
  const q = normalize(input);
  const f: Filters = {};
  const text = q.q?.trim().slice(0, 100).trim();
  if (text) f.q = text;
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
