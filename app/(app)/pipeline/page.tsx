import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/shell/page-header';
import { moveContactAction } from '@/features/contacts/actions';
import { NewContactLink } from '@/features/contacts/list/new-contact-link';
import { loadMoreColumnAction } from '@/features/pipeline/actions';
import { Board } from '@/features/pipeline/board';
import { toPipelineRows } from '@/features/pipeline/to-rows';
import {
  loadListQuery,
  serializeListQuery,
  toFilters,
} from '@/lib/contracts/list-query';
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
  const [lead, active, closed, facets, tz, jar] = await Promise.all([
    getPipelineColumn('lead', filters, 0),
    getPipelineColumn('active', filters, 0),
    getPipelineColumn('closed', filters, 0),
    getContactFacets(filters),
    getRequestTimeZone(),
    cookies(),
  ]);
  const today = todayIn(tz);
  const col = (c: typeof lead) => ({
    rows: toPipelineRows(c.rows, today),
    matching: c.matching,
  });

  return (
    // md+: the page fills the viewport and each column scrolls inside it, like the list's table.
    <div className="flex flex-col gap-3 md:h-[calc(100dvh-34px)] md:min-h-[480px]">
      <PageHeader
        title="Pipeline"
        meta={`${fmt(facets.matching)} of ${fmt(facets.total)}`}
        actions={<NewContactLink className="max-md:hidden" />}
      />
      <Board
        // A new filter set is a new board: paged-in rows and moves belong to the old one.
        key={JSON.stringify(filters)}
        columns={{ lead: col(lead), active: col(active), closed: col(closed) }}
        filters={filters}
        facets={facets}
        filtersOpen={jar.get('filters_open')?.value === '1'}
        onMove={moveContactAction}
        onLoadMore={loadMoreColumnAction}
      />
    </div>
  );
}
