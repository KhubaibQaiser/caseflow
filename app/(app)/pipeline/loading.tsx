import { Skeleton } from '@/components/ui/skeleton';

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
    <div
      aria-busy="true"
      className="flex flex-col gap-3 md:h-[calc(100dvh-34px)] md:min-h-[480px]"
    >
      <span className="sr-only" role="status">
        Loading pipeline
      </span>
      <div className="flex h-[34px] items-center gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="w-20" />
      </div>
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-2">
        <Skeleton className="rounded-ctl h-10 w-full md:h-[34px] md:w-80" />
        <Skeleton className="rounded-ctl h-9 w-full md:h-[34px] md:w-24" />
        <Skeleton className="h-[34px] w-64 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg md:hidden" />
      <div className="grid min-h-0 flex-1 gap-3.5 md:grid-cols-3">
        {[0, 1, 2].map((c) => (
          <div
            key={c}
            className={`bg-track rounded-surface flex-col gap-2 overflow-hidden p-2.5 ${c === 0 ? 'flex' : 'hidden md:flex'}`}
          >
            <div className="flex items-center gap-2 px-1 py-0.5">
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
