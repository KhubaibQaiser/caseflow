import { stickyTop } from '@/components/shell/page-header';
import { Skeleton } from '@/components/ui/skeleton';

// Mirrors the real fieldset (31.5px of legend and padding above the first field), so the boxes line up to the pixel.
const fieldset =
  'rounded-surface border-line bg-surface flex flex-col gap-3 border px-4 pt-[30.5px] pb-4';

// Label row 19.5px, 6px gap, then the control: the same 61.5px the real Field takes.
function FieldSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-[19.5px] items-center">
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className={tall ? 'h-18 w-full' : 'h-9 w-full'} />
      {tall && <Skeleton className="h-4 w-16" />}
    </div>
  );
}

// Same footprint as the form, so nothing jumps when the contact arrives.
export function FormSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading contact"
      className="flex flex-col gap-3.5"
    >
      <div className={`flex flex-col gap-1.5 ${stickyTop}`}>
        <div className="flex min-h-8.5 items-center max-md:h-[19.5px] max-md:min-h-0">
          <Skeleton className="h-3.5 w-56" />
        </div>
        <div className="flex h-7 items-center md:h-8">
          <Skeleton className="h-5 w-44" />
        </div>
      </div>
      <div className="flex max-w-3xl flex-col gap-3.5">
        <div className={fieldset}>
          <FieldSkeleton />
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
        </div>
        <div className={fieldset}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <FieldSkeleton tall />
        </div>
        <div className={fieldset}>
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <Skeleton className="h-[59.5px] w-full" />
            <Skeleton className="h-[83.5px] w-full" />
          </div>
        </div>
        <div className="flex h-8.5 justify-end gap-2">
          <Skeleton className="rounded-ctl h-8.5 w-18" />
          <Skeleton className="rounded-ctl h-8.5 w-27" />
        </div>
      </div>
    </div>
  );
}
