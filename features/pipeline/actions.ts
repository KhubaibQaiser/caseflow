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

import { PAGE_SIZE } from './rows';
import type { ColumnData } from './rows';
import { toPipelineRows } from './to-rows';

const Input = z.object({
  status: z.enum(STATUSES),
  filters: FiltersSchema,
  /** The page to add (the first, page 0, comes with the board). */
  page: z.number().int().min(1).max(20_000),
});

/**
 * "Show 50 more": one more page of one column, under the board's filters. The RPC pages by number
 * (offsets sit on page boundaries), and moves shift pages, so the page before comes too; the client merges by id.
 */
export async function loadMoreColumnAction(
  raw: unknown,
): Promise<Result<Omit<ColumnData, 'pages'>>> {
  const viewer = await getViewer();
  if (!viewer.permissions.includes('contacts.read'))
    return fail('forbidden', "You don't have permission to view contacts.");
  const p = Input.safeParse(raw);
  if (!p.success) return fail('validation', 'Reload the board and try again.');
  const { status, filters, page } = p.data;
  const [prev, next, tz] = await Promise.all([
    getPipelineColumn(status, filters, (page - 1) * PAGE_SIZE, PAGE_SIZE),
    getPipelineColumn(status, filters, page * PAGE_SIZE, PAGE_SIZE),
    getRequestTimeZone(),
  ]);
  return ok({
    rows: toPipelineRows([...prev.rows, ...next.rows], todayIn(tz)),
    matching: next.matching,
  });
}
