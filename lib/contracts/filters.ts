import './zod-config';
import { z } from 'zod';

import { MATTER_TYPES, REFERRAL_SOURCES, STATUSES } from './enums';
import { FOLLOW_UP_VALUES } from './list-query';

// The RPC-side filter contract (spec 7.4). Kept apart from list-query so zod stays off the client.
const date = z.iso.date();

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
