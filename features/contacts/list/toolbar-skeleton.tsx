import { stickyTop } from '@/components/shell/page-header';
import { Skeleton } from '@/components/ui/skeleton';

/** Heading row of the loading screens; `titleWidth` is the heading's Tailwind width. */
export function HeaderSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <div className={`flex h-8.5 items-center gap-x-2.5 md:h-13 ${stickyTop}`}>
      <Skeleton className={`h-5 ${titleWidth}`} />
      <Skeleton className="w-20" />
    </div>
  );
}

/** Search, button and filters pill, at the toolbar's own sizes so nothing shifts when it lands. */
export function ToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-2">
      <Skeleton className="rounded-ctl h-10 w-full md:h-8.5 md:w-80" />
      <Skeleton className="rounded-ctl h-9 w-full md:h-8.5 md:w-24" />
      <Skeleton className="h-8.5 w-64 rounded-lg" />
    </div>
  );
}
