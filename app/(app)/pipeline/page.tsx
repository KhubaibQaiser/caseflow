import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/shell/page-header';
import { moveContactAction } from '@/features/contacts/actions';
import { listPageFrame } from '@/features/contacts/list/frame';
import { NewContactLink } from '@/features/contacts/list/new-contact-link';
import { loadMoreColumnAction } from '@/features/pipeline/actions';
import { Board } from '@/features/pipeline/board';
import { toPipelineRows } from '@/features/pipeline/to-rows';
import {
  loadListQuery,
  serializeListQuery,
  toFilters,
} from '@/lib/contracts/list-query';
import { parsePipelineSorts } from '@/lib/contracts/pipeline-sort-schema';
import { getContactFacets, getPipelineColumn } from '@/lib/data';
import { todayIn } from '@/lib/dates/date-only';
import { getRequestTimeZone } from '@/lib/dates/server';

export const metadata: Metadata = { title: 'Pipeline · Caseflow' };

const fmt = (n: number) => n.toLocaleString('en-US');

export default async function PipelinePage({
  searchParams,
}: PageProps<'/pipeline'>) {
  const query = loadListQuery(await searchParams);
  // The columns are the status filter: a status in the URL would show as a chip that does nothing.
  if (query.status)
    redirect(serializeListQuery('/pipeline', { ...query, status: null }));
  const filters = toFilters(query);
  const sorts = parsePipelineSorts(query);
  const [lead, active, closed, facets, tz, jar] = await Promise.all([
    getPipelineColumn('lead', filters, 0, 50, sorts.lead),
    getPipelineColumn('active', filters, 0, 50, sorts.active),
    getPipelineColumn('closed', filters, 0, 50, sorts.closed),
    getContactFacets(filters),
    getRequestTimeZone(),
    cookies(),
  ]);
  const today = todayIn(tz);
  const col = (c: typeof lead) => ({
    rows: toPipelineRows(c.rows, today),
    matching: c.matching,
    pages: 1,
  });

  return (
    // md+: the page fills the viewport and each column scrolls inside it, like the list's table.
    <div className={listPageFrame}>
      <PageHeader
        title="Pipeline"
        meta={`${fmt(facets.matching)} of ${fmt(facets.total)}`}
        actions={<NewContactLink />}
      />
      <Board
        // A new filter set, a new day or a new time zone is a new board: paged-in rows and moves belong to the old one,
        // and the follow-up labels (Today, Overdue · 2d) are only right for the day they were worked out (spec 8.7).
        key={JSON.stringify({ filters, today, tz })}
        columns={{ lead: col(lead), active: col(active), closed: col(closed) }}
        filters={filters}
        sorts={sorts}
        facets={facets}
        filtersOpen={jar.get('filters_open')?.value === '1'}
        onMove={moveContactAction}
        onLoadMore={loadMoreColumnAction}
      />
    </div>
  );
}
