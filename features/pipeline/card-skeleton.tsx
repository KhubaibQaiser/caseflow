import { Skeleton } from '@/components/ui/skeleton';

const NAME = ['w-32', 'w-40', 'w-28', 'w-36', 'w-24'];

/** One PipelineCard's boxes; `i` varies the name width so a stack reads as data. */
export function CardSkeleton({ i }: { i: number }) {
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
