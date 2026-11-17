import { Skeleton } from '@/components/ui/skeleton';

const panel = 'border-line bg-surface rounded-surface border px-4 py-3.5';

function Rows({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      {widths.map((w, i) => (
        <Skeleton key={i} className={w} />
      ))}
    </div>
  );
}

/** The header, three panels and the timeline, at the sizes they land at, so nothing shifts. */
export default function ContactLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3.5">
      <span className="sr-only" role="status">
        Loading contact
      </span>
      <Skeleton className="h-3.5 w-40" />
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="rounded-ctl h-[34px] w-28 max-md:h-11 max-md:flex-1" />
          <Skeleton className="rounded-ctl h-[34px] w-20 max-md:h-11" />
        </div>
      </div>
      <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <section className={panel}>
            <Skeleton className="mb-3 h-3 w-20" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="w-28" />
              <Skeleton className="rounded-ctl ml-auto h-[30px] w-24" />
            </div>
          </section>
          <section className={panel}>
            <Skeleton className="mb-3 h-3 w-16" />
            <Rows widths={['w-3/5', 'w-2/5', 'w-1/3', 'w-1/2', 'w-4/5']} />
          </section>
          <section className={panel}>
            <Skeleton className="mb-3 h-3 w-14" />
            <Skeleton className="rounded-ctl mb-3 h-[72px] w-full" />
            <Rows widths={['w-4/5', 'w-3/5', 'w-2/3']} />
          </section>
        </div>
        <section className={panel}>
          <Skeleton className="mb-3 h-3 w-16" />
          <Rows widths={['w-4/5', 'w-3/5', 'w-2/3', 'w-1/2']} />
        </section>
      </div>
    </div>
  );
}
