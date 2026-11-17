'use server';

import { z } from 'zod';

import { assertPermission } from '@/lib/auth/viewer-supabase';
import { STATUSES } from '@/lib/contracts/enums';
import { FiltersSchema } from '@/lib/contracts/filters';
import { PipelineSortSchema } from '@/lib/contracts/pipeline-sort-schema';
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
  sort: PipelineSortSchema,
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
  const g = await assertPermission('contacts.read');
  if (!g.ok) return g;
  const p = Input.safeParse(raw);
  if (!p.success) return fail('validation', 'Reload the board and try again.');
  const { status, filters, sort, page } = p.data;
  const [prev, next, tz] = await Promise.all([
    getPipelineColumn(status, filters, (page - 1) * PAGE_SIZE, PAGE_SIZE, sort),
    getPipelineColumn(status, filters, page * PAGE_SIZE, PAGE_SIZE, sort),
    getRequestTimeZone(),
  ]);
  return ok({
    rows: toPipelineRows([...prev.rows, ...next.rows], todayIn(tz)),
    matching: next.matching,
  });
}
