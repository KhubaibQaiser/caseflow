import { Skeleton } from '@/components/ui/skeleton';

// Widths vary row to row so the skeleton reads as data, not a striped block.
const NAME = ['w-32', 'w-40', 'w-28', 'w-36', 'w-24', 'w-44'];
const HEADERS = [
  'w-10',
  'w-12',
  'w-10',
  'w-14',
  'w-10',
  'w-10',
  'w-12',
  'w-12',
];

/** Table-shaped: the same header, toolbar and 36px rows the list lands in, so nothing shifts. */
export default function ContactsLoading() {
  const rows = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-3 md:h-[calc(100dvh-34px)] md:min-h-[480px]"
    >
      <span className="sr-only" role="status">
        Loading contacts
      </span>
      <div className="flex h-[30px] items-center gap-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="w-20" />
      </div>
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-2">
        <Skeleton className="rounded-ctl h-10 w-full md:h-[34px] md:w-80" />
        <Skeleton className="rounded-ctl h-9 w-full md:h-[34px] md:w-24" />
        <Skeleton className="h-[34px] w-64 rounded-lg" />
      </div>
      <div className="border-line bg-surface rounded-surface min-h-0 flex-1 overflow-hidden border">
        <div className="border-line bg-panel hidden h-[34px] items-center gap-6 border-b px-2.5 md:flex">
          {HEADERS.map((w, i) => (
            <Skeleton key={i} className={`h-2 ${w}`} />
          ))}
        </div>
        {rows.map((i) => (
          <div
            key={i}
            className="border-line-soft flex flex-col gap-2 border-b px-3 py-2.5 md:h-9 md:flex-row md:items-center md:gap-6 md:px-2.5 md:py-0"
          >
            <Skeleton className={NAME[i % NAME.length]} />
            <Skeleton className="w-3/5 md:w-24" />
            <Skeleton className="hidden w-12 md:block" />
            <Skeleton className="hidden w-20 md:block" />
            <Skeleton className="hidden w-24 lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
