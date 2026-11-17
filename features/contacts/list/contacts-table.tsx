'use client';

import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import ArrowDown from 'lucide-react/icons/arrow-down';
import ArrowUp from 'lucide-react/icons/arrow-up';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { StatusPill, UrgencyPill } from '@/components/ui/pill';
import { formatPhoneLite } from '@/utils/format-phone';
import { cn } from '@/utils/cn';

import {
  COLUMN_WIDTH,
  SORT_OPTIONS,
  matterLabel,
  sourceLabel,
} from './columns';
import type { SortDir, SortKey } from './columns';
import type { ListRow } from './list-rows';

const ROW_HEIGHT = 36;
const features = tableFeatures({ rowSortingFeature });
const helper = createColumnHelper<typeof features, ListRow>();

const muted = (text: string) => <span className="text-ink-2">{text}</span>;

// Fixed widths: with table-layout fixed, virtualized rows can't reflow the columns as they scroll in.
const WIDTH: Record<string, number> = COLUMN_WIDTH;
const SORT_BY_COLUMN: Record<string, SortKey> = {
  name: 'name',
  status: 'status',
  followUp: 'follow_up',
  waiting: 'waiting',
};

const columns = helper.columns([
  helper.accessor('fullName', {
    id: 'name',
    header: 'Name',
    cell: ({ row: { original: r } }) => (
      <Link
        href={`/contacts/${r.id}`}
        // 250 rows of links would otherwise prefetch 250 detail pages.
        prefetch={false}
        title={r.fullName}
        // Inset ring: the truncating (and pinned) cell clips anything drawn outside it.
        className="text-ink rounded-ctl block truncate py-0.5 font-semibold no-underline hover:underline focus-visible:shadow-none focus-visible:-outline-offset-2"
      >
        {r.fullName}
      </Link>
    ),
  }),
  helper.accessor('matterType', {
    id: 'matter',
    header: 'Matter',
    enableSorting: false,
    cell: ({ row }) => matterLabel(row.original),
  }),
  helper.accessor('status', {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusPill status={getValue()} />,
  }),
  helper.accessor('followUpOn', {
    id: 'followUp',
    header: 'Follow-up',
    cell: ({ row }) => <UrgencyPill {...row.original.followUp} />,
  }),
  helper.accessor('phone', {
    id: 'phone',
    header: 'Phone',
    enableSorting: false,
    cell: ({ getValue }) => {
      const phone = getValue();
      return phone ? formatPhoneLite(phone) : muted('No phone');
    },
  }),
  helper.accessor('email', {
    id: 'email',
    header: 'Email',
    enableSorting: false,
    cell: ({ getValue }) => {
      const email = getValue();
      return email ? (
        <span title={email} className="text-ink-2 block max-w-45 truncate">
          {email}
        </span>
      ) : (
        muted('No email')
      );
    },
  }),
  helper.accessor('referralSource', {
    id: 'source',
    header: 'Source',
    enableSorting: false,
    cell: ({ row }) => muted(sourceLabel(row.original)),
  }),
  helper.accessor('createdAt', {
    id: 'waiting',
    header: 'Waiting',
    cell: ({ row }) => muted(row.original.waiting),
  }),
]);

// Waiting shows days, which run opposite to the created date it sorts by.
function shownDirection(key: SortKey, dir: SortDir) {
  const asc = key === 'waiting' ? dir === 'desc' : dir === 'asc';
  return asc ? 'ascending' : 'descending';
}

// The first column stays put while 1024–1279px scrolls sideways.
const pinned = 'sticky left-0 z-1 border-r border-r-line';

type ContactsTableProps = {
  rows: ListRow[];
  /** Rows across every page, for aria-rowcount. */
  matching: number;
  /** Rows before this page, for aria-rowindex. */
  offset: number;
  sort: SortKey;
  dir: SortDir;
  onSort(key: SortKey): void;
  /** Changes when the sort or filters change; the table then scrolls back to the top. */
  scrollKey?: string;
  className?: string;
};

export function ContactsTable({
  rows,
  matching,
  offset,
  sort,
  dir,
  onSort,
  scrollKey,
  className,
}: ContactsTableProps) {
  const sortedColumn = Object.keys(SORT_BY_COLUMN).find(
    (id) => SORT_BY_COLUMN[id] === sort,
  );
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (r) => r.id,
    manualSorting: true,
    state: {
      sorting: sortedColumn ? [{ id: sortedColumn, desc: dir === 'desc' }] : [],
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastKey = useRef(scrollKey);
  // Only a different list moves the reader; a refresh of the same one keeps their place.
  useEffect(() => {
    if (lastKey.current === scrollKey) return;
    lastKey.current = scrollKey;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [scrollKey]);
  const tableRows = table.getRowModel().rows;
  // eslint-disable-next-line react-hooks/incompatible-library -- no React Compiler here; the virtualizer is meant to re-render.
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    // The server renders the first screenful so rows paint before hydration.
    initialRect: { width: 1200, height: 900 },
  });
  const items = virtualizer.getVirtualItems();
  const before = items[0]?.start ?? 0;
  const after = virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0);
  const label = SORT_OPTIONS.find((o) => o.key === sort);
  const spacer = (height: number): ReactNode =>
    height > 0 && (
      <tr aria-hidden style={{ height }}>
        <td colSpan={columns.length} />
      </tr>
    );

  return (
    <div
      ref={scrollRef}
      data-results-scroll
      className={cn(
        'border-line bg-surface rounded-surface min-h-0 overflow-auto overscroll-contain border',
        className,
      )}
    >
      <table
        aria-rowcount={matching + 1}
        className="text-13 text-ink tnum w-full min-w-281 table-fixed border-separate border-spacing-0"
      >
        <caption
          tabIndex={-1}
          data-results-focus
          className="sr-only outline-none"
        >
          Contacts
          {label &&
            `, sorted by ${label.label}, ${dir === 'asc' ? label.asc : label.desc}`}
        </caption>
        <colgroup>
          {columns.map((c) => (
            <col key={c.id} style={{ width: WIDTH[c.id!] }} />
          ))}
        </colgroup>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} aria-rowindex={1}>
              {group.headers.map((header) => {
                const key = SORT_BY_COLUMN[header.column.id];
                const sorted = header.column.getIsSorted();
                const shown = key && sorted ? shownDirection(key, dir) : null;
                const Arrow = shown === 'descending' ? ArrowDown : ArrowUp;
                const text = header.column.columnDef.header as string;
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={shown ?? undefined}
                    className={cn(
                      'border-line bg-panel text-ink-2 sticky top-0 z-2 h-8.5 border-b px-2.5 text-left text-xs font-semibold whitespace-nowrap',
                      header.column.id === 'name' && `${pinned} z-3`,
                      shown && 'text-ink',
                    )}
                  >
                    {key ? (
                      <button
                        type="button"
                        onClick={() => onSort(key)}
                        className="hover:text-ink rounded-ctl -mx-1 inline-flex min-h-6 cursor-pointer items-center gap-1 px-1 font-semibold"
                      >
                        {text}
                        {shown && (
                          <Arrow aria-hidden className="text-accent size-3.5" />
                        )}
                      </button>
                    ) : (
                      text
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {spacer(before)}
          {items.map((item) => {
            const r = tableRows[item.index];
            if (!r) return null;
            return (
              <tr
                key={r.id}
                aria-rowindex={offset + item.index + 2}
                className="group"
              >
                {r.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'border-line-soft bg-surface group-hover:bg-panel h-9 truncate border-b px-2.5',
                      cell.column.id === 'name' && pinned,
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            );
          })}
          {spacer(after)}
        </tbody>
      </table>
    </div>
  );
}
