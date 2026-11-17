import './zod-config';
import { z } from 'zod';
import {
  FOLLOW_UP_FILTERS,
  MATTER_TYPES,
  REFERRAL_SOURCES,
  STATUSES,
} from './enums';

const counts = <const K extends readonly [string, ...string[]]>(keys: K) =>
  z.record(z.enum(keys), z.number());

export const ContactFacetsSchema = z.object({
  total: z.number(),
  matching: z.number(),
  quickViews: z.object({
    all: z.number(),
    overdue: z.number(),
    dueToday: z.number(),
  }),
  facets: z.object({
    status: counts(STATUSES),
    matterType: counts(MATTER_TYPES),
    referralSource: counts(REFERRAL_SOURCES),
    followUp: counts(FOLLOW_UP_FILTERS),
  }),
});
export type ContactFacets = z.infer<typeof ContactFacetsSchema>;
