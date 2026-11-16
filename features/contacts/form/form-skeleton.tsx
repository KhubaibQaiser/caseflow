import { Skeleton } from '@/components/ui/skeleton';

const fieldset =
  'rounded-surface border-line bg-surface flex flex-col gap-3 border px-4 pt-3 pb-4';

function FieldSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className={tall ? 'h-[72px] w-full' : 'h-9 w-full'} />
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
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3.5 w-56" />
        <Skeleton className="h-7 w-44" />
      </div>
      <div className="flex max-w-[720px] flex-col gap-3.5">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
