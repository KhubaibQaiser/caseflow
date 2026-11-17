import { z } from 'zod';

import { PIPELINE_SORTS, PIPELINE_SORT_PARAM } from './pipeline-sort';
import type { PipelineSorts } from './pipeline-sort';
import { STATUSES } from './enums';

export const PipelineSortSchema = z.enum(PIPELINE_SORTS);

/** Each column's sort from the URL; a missing or invalid value is urgency. */
export function parsePipelineSorts(
  query: Partial<
    Record<
      (typeof PIPELINE_SORT_PARAM)[keyof typeof PIPELINE_SORT_PARAM],
      string | null
    >
  >,
): PipelineSorts {
  const sorts = {} as PipelineSorts;
  for (const s of STATUSES)
    sorts[s] =
      PipelineSortSchema.safeParse(query[PIPELINE_SORT_PARAM[s]]).data ??
      'urgency';
  return sorts;
}
