'use server';

import { z } from 'zod';

import { getViewer } from '@/lib/auth/viewer';
import { STATUSES } from '@/lib/contracts/enums';
import { FiltersSchema } from '@/lib/contracts/filters';
import { fail, ok } from '@/lib/contracts/result';
import type { Result } from '@/lib/contracts/result';
import { getPipelineColumn } from '@/lib/data';
import { todayIn } from '@/lib/dates/date-only';
import { getRequestTimeZone } from '@/lib/dates/server';

import type { ColumnData } from './rows';
import { toPipelineRows } from './to-rows';

const Input = z.object({
  status: z.enum(STATUSES),
  filters: FiltersSchema,
  offset: z.number().int().min(0).max(1_000_000),
});

/** "Show 50 more": the next 50 rows of one column, under the board's filters. */
export async function loadMoreColumnAction(
  raw: unknown,
): Promise<Result<ColumnData>> {
  const viewer = await getViewer();
  if (!viewer.permissions.includes('contacts.read'))
    return fail('forbidden', "You don't have permission to view contacts.");
  const p = Input.safeParse(raw);
  if (!p.success) return fail('validation', 'Reload the board and try again.');
  const [col, tz] = await Promise.all([
    getPipelineColumn(p.data.status, p.data.filters, p.data.offset),
    getRequestTimeZone(),
  ]);
  return ok({
    rows: toPipelineRows(col.rows, todayIn(tz)),
    matching: col.matching,
  });
}
