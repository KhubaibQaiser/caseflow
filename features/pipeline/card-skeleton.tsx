import { Skeleton } from '@/components/ui/skeleton';

const NAME = ['w-32', 'w-40', 'w-28', 'w-36', 'w-24'];

/** One PipelineCard's boxes, to its height (110px; 118px on a phone); `i` varies the name width so a stack reads as data. */
export function CardSkeleton({ i }: { i: number }) {
  return (
    <div className="border-line bg-surface flex flex-col gap-1 rounded-lg border px-3 py-2.5">
      <div className="flex h-6 items-center justify-between gap-3">
        <Skeleton className={`h-3.5 ${NAME[i % NAME.length]}`} />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex h-6 items-center">
        <Skeleton className="h-3 w-36" />
      </div>
      <Skeleton className="mt-1 h-7 w-24 rounded-md max-md:h-9" />
    </div>
  );
}
