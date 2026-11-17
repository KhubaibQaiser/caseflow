import { headroomLayout } from '@/components/shell/headroom-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/features/pipeline/card-skeleton';
import { listPageFrame } from '@/features/contacts/list/frame';
import {
  HeaderSkeleton,
  ToolbarSkeleton,
} from '@/features/contacts/list/toolbar-skeleton';

/** Three columns of cards (one on a phone), in the board's own frame, so nothing shifts when it lands. */
export default function PipelineLoading() {
  return (
    <div aria-busy="true" className={listPageFrame}>
      <span className="sr-only" role="status">
        Loading pipeline
      </span>
      <div className={headroomLayout}>
        <HeaderSkeleton titleWidth="w-24" />
        {/* Tabs first on a phone, as on the board. */}
        <div className="md:hidden">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10.5 min-w-0 flex-1 rounded-lg" />
            <Skeleton className="rounded-ctl size-10.5" />
          </div>
          {/* The "sorted by" line. */}
          <div className="mt-2 flex h-[19.5px] items-center">
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      </div>
      <ToolbarSkeleton />
      <div className="grid min-h-0 flex-1 gap-3.5 md:grid-cols-3">
        {[0, 1, 2].map((c) => (
          <div
            key={c}
            className={`md:bg-track md:rounded-surface flex-col gap-2 overflow-hidden md:p-2.5 ${c === 0 ? 'flex' : 'hidden md:flex'}`}
          >
            <div className="flex items-center gap-2 px-1 py-0.5 max-md:hidden">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-8" />
            </div>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <CardSkeleton key={i} i={i + c} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
