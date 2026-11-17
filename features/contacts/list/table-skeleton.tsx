import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

import { COLUMN_WIDTH } from './columns';

const COLUMNS = Object.values(COLUMN_WIDTH);
// Widths vary row to row so the skeleton reads as data, not a striped block.
const HEADER = ['w-10', 'w-12', 'w-10', 'w-14', 'w-10', 'w-10', 'w-12', 'w-12'];
const CELL = [
  ['w-28', 'w-36', 'w-24', 'w-32', 'w-20', 'w-30'],
  ['w-24', 'w-20', 'w-28'],
  ['w-12'],
  ['w-16', 'w-20'],
  ['w-24', 'w-20'],
  ['w-32', 'w-28', 'w-36'],
  ['w-16', 'w-20', 'w-12'],
  ['w-8'],
];

/** The table's header row and rows, cell for cell: the same fixed columns, 34px header and 36px rows as ContactsTable. */
export function TableSkeleton({
  rows,
  className,
}: {
  rows: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-line bg-surface rounded-surface min-h-0 overflow-hidden border',
        className,
      )}
    >
      <table className="w-full min-w-281 table-fixed border-separate border-spacing-0">
        <colgroup>
          {COLUMNS.map((width, i) => (
            <col key={i} style={{ width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {HEADER.map((w, i) => (
              <th
                key={i}
                className="border-line bg-panel h-8.5 border-b px-2.5 text-left"
              >
                <Skeleton className={cn('h-2', w)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <TableSkeletonRows rows={rows} />
        </tbody>
      </table>
    </div>
  );
}

/** Just the <tr>s, for a table that already has its own header (the list, while filters load). */
export function TableSkeletonRows({ rows }: { rows: number }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r}>
      {CELL.map((widths, c) => (
        <td key={c} className="border-line-soft h-9 border-b px-2.5">
          <Skeleton className={widths[(r + c) % widths.length]} />
        </td>
      ))}
    </tr>
  ));
}

/** Below 768px: the same 72px cards as ContactCards, so the skeleton and the list are the same height. */
export function CardsSkeleton({
  rows,
  className,
}: {
  rows: number;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        'border-line bg-surface rounded-surface divide-line-soft m-0 list-none divide-y overflow-hidden border p-0',
        className,
      )}
    >
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="grid h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.75 px-3 py-2.5"
        >
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="col-span-2 h-4 w-3/5" />
        </li>
      ))}
    </ul>
  );
}
