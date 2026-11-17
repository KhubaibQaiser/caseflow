import { Skeleton } from '@/components/ui/skeleton';

const panel = 'border-line bg-surface rounded-surface border px-4 py-3.5';

// Heights match the real elements (20px heading line, 20px rows) so the page lands without a jump.
function Heading({ w }: { w: string }) {
  return (
    <div className="mb-2.5 flex h-5 items-center">
      <Skeleton className={`h-3 ${w}`} />
    </div>
  );
}

function Rows({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {widths.map((w, i) => (
        <div key={i} className="flex h-5 items-center">
          <Skeleton className={w} />
        </div>
      ))}
    </div>
  );
}

/** The header, three panels and the timeline, at the sizes they land at. */
export default function ContactLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3.5">
      <span className="sr-only" role="status">
        Loading contact
      </span>
      <div className="flex h-[18px] items-center">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-[22px] w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="rounded-ctl h-[34px] w-28 max-md:h-11 max-md:flex-1" />
          <Skeleton className="rounded-ctl h-[34px] w-20 max-md:h-11" />
        </div>
      </div>
      <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <section className={panel}>
            <Heading w="w-20" />
            <div className="flex h-[30px] items-center gap-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="w-28" />
              <Skeleton className="rounded-ctl ml-auto h-[30px] w-24" />
            </div>
          </section>
          <section className={panel}>
            <Heading w="w-16" />
            <Rows widths={['w-3/5', 'w-2/5', 'w-1/3', 'w-1/2', 'w-4/5']} />
          </section>
          <section className={panel}>
            <Heading w="w-14" />
            <Skeleton className="rounded-ctl h-[82px] w-full" />
            <Skeleton className="rounded-ctl mt-2 mb-3 ml-auto h-[30px] w-24" />
            <Rows widths={['w-4/5', 'w-3/5', 'w-2/3']} />
          </section>
        </div>
        <section className={panel}>
          <Heading w="w-16" />
          <Rows widths={['w-4/5', 'w-3/5', 'w-2/3', 'w-1/2']} />
        </section>
      </div>
    </div>
  );
}
