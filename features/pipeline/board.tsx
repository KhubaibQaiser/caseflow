'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, lazy, useLayoutEffect, useRef, useState } from 'react';

import type { ContactRow } from '@/lib/contracts/contact';
import { STATUSES } from '@/lib/contracts/enums';
import type { Status } from '@/lib/contracts/enums';
import type { ContactFacets } from '@/lib/contracts/facets';
import type { Filters } from '@/lib/contracts/filters';
import type { Result } from '@/lib/contracts/result';
import { usePermission } from '@/lib/auth/permissions-context';

import { useFiltersPanel } from '../contacts/filters/use-filters-panel';
import { Filtered, FirstRun } from '../contacts/list/empty-states';
import { BusyRegion } from '../contacts/list/busy-region';
import { Toolbar } from '../contacts/list/toolbar';
import { ListTransition, useListQuery } from '../contacts/url-state';
import { Column } from './column';
import { MobileTabs } from './mobile-tabs';
import { hasMore } from './rows';
import type { ColumnData, Columns } from './rows';
import { useBoardMoves } from './use-board-moves';

// Same as the list: the panel's code waits for hover, focus or the first open.
const loadPanel = () => import('../contacts/filters/filters-panel');
const FiltersPanel = lazy(() =>
  loadPanel().then((m) => ({ default: m.FiltersPanel })),
);

export const VIEWER_REASON = "Viewers can't move contacts.";

type BoardProps = {
  columns: Columns;
  /** The filters these columns were loaded under; "Show 50 more" repeats them. */
  filters: Filters;
  facets: ContactFacets;
  /** The `filters_open` cookie, read on the server. */
  filtersOpen: boolean;
  onMove(id: string, to: Status): Promise<Result<ContactRow>>;
  onLoadMore(input: {
    status: Status;
    filters: Filters;
    page: number;
  }): Promise<Result<Pick<ColumnData, 'rows' | 'matching'>>>;
};

export function Board(props: BoardProps) {
  return (
    <ListTransition>
      <Results {...props} />
    </ListTransition>
  );
}

function Results({
  columns: initial,
  filters,
  facets,
  filtersOpen,
  onMove,
  onLoadMore,
}: BoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams()?.toString();
  const [, , isPending] = useListQuery();
  const filtersButton = useRef<HTMLButtonElement>(null);
  const panel = useFiltersPanel(filtersOpen, filtersButton);
  const canMove = usePermission('contacts.write');
  const [tab, setTab] = useState<Status>('lead');

  const expire = () =>
    router.push(
      `/login?reason=expired&next=${encodeURIComponent(pathname + (search ? `?${search}` : ''))}`,
    );
  const { columns, move, append } = useBoardMoves(initial, onMove, expire);

  // A card that leaves takes the keyboard's place with it: focus its neighbour (or the column's heading
  // when it was the only card), or the card that came back. The target is dropped once used.
  const focus = useRef<string | null>(null);
  const tryFocus = () => {
    if (!focus.current) return;
    const el = document.querySelector<HTMLElement>(focus.current);
    if (!el) return;
    focus.current = null;
    el.focus();
  };
  useLayoutEffect(tryFocus);
  const moveAndKeepFocus = async (id: string, to: Status) => {
    const from = STATUSES.find((s) => columns[s].rows.some((r) => r.id === id));
    const rows = from ? columns[from].rows : [];
    const i = rows.findIndex((r) => r.id === id);
    const next = rows[i + 1] ?? rows[i - 1];
    if (from)
      focus.current = next
        ? `[data-card="${CSS.escape(next.id)}"] [data-card-link]`
        : `[data-column="${from}"]`;
    const result = await move(id, to);
    if (!result.ok)
      // Back where it was: the rollback render is next, and its layout effect returns the keyboard to the card.
      focus.current = `[data-card="${CSS.escape(id)}"] button`;
    else
      // Whatever is unused cannot appear (a card counted but not shown): don't hold it.
      requestAnimationFrame(() => {
        focus.current = null;
      });
    return result;
  };

  const matching = STATUSES.reduce((n, s) => n + columns[s].matching, 0);
  const none = facets.total === 0;

  const showBoard = !none && matching > 0;

  return (
    <>
      {/* First on a phone, straight under the title; the toolbar's search and filters follow. */}
      {showBoard && (
        <MobileTabs columns={columns} value={tab} onChange={setTab} />
      )}
      {!none && (
        <Toolbar
          facets={facets}
          isPending={isPending}
          panel={panel}
          hideSort
          filtersButton={filtersButton}
          onFiltersIntent={() => void loadPanel()}
        />
      )}
      <p role="status" className="sr-only">
        {matching.toLocaleString('en-US')}{' '}
        {matching === 1 ? 'contact' : 'contacts'}
      </p>
      {none ? (
        <FirstRun />
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col gap-3">
          {matching === 0 ? (
            <Filtered />
          ) : (
            <BusyRegion busy={isPending}>
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-3.5 md:grid-cols-3">
                {STATUSES.map((s) => (
                  <Column
                    key={s}
                    status={s}
                    rows={columns[s].rows}
                    matching={columns[s].matching}
                    exhausted={!hasMore(columns[s])}
                    onMove={moveAndKeepFocus}
                    disabledReason={canMove ? undefined : VIEWER_REASON}
                    className={s === tab ? undefined : 'max-md:hidden'}
                    onLoadMore={async () => {
                      const r = await onLoadMore({
                        status: s,
                        filters,
                        page: columns[s].pages,
                      });
                      if (r.ok) append(s, r.data.rows, r.data.matching);
                      else if (r.error.code === 'unauthorized') expire();
                      return r.ok;
                    }}
                  />
                ))}
              </div>
            </BusyRegion>
          )}
          {panel.mounted && (
            <Suspense fallback={null}>
              <FiltersPanel
                open={panel.open}
                onOpenChange={panel.setOpen}
                facets={facets}
                hideStatus
                focusOnOpen={panel.focusOnOpen}
                returnFocusTo={filtersButton}
              />
            </Suspense>
          )}
        </div>
      )}
    </>
  );
}
