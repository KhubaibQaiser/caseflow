import { headroomLayout } from '@/components/shell/headroom-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { listPageFrame } from '@/features/contacts/list/frame';
import {
  HeaderSkeleton,
  ToolbarSkeleton,
} from '@/features/contacts/list/toolbar-skeleton';

const NAME = ['w-32', 'w-40', 'w-28', 'w-36', 'w-24'];

function Card({ i }: { i: number }) {
  return (
    <div className="border-line bg-surface rounded-lg border px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className={`h-3.5 ${NAME[i % NAME.length]}`} />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-2 h-3 w-36" />
      <Skeleton className="mt-2.5 h-7 w-24 rounded-md" />
    </div>
  );
}

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
        <Skeleton className="h-10.5 w-full rounded-lg md:hidden" />
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
              <Card key={i} i={i + c} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
