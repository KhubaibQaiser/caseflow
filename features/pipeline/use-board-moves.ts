'use client';

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';

import { toast } from '@/components/ui/toaster';
import type { ContactRow } from '@/lib/contracts/contact';
import { STATUSES, STATUS_LABEL } from '@/lib/contracts/enums';
import type { Status } from '@/lib/contracts/enums';
import type {
  PipelineSort,
  PipelineSorts,
} from '@/lib/contracts/pipeline-sort';
import { fail } from '@/lib/contracts/result';
import type { Result } from '@/lib/contracts/result';

import { appendRows, applyMove } from './rows';
import type { Columns, PipelineRow } from './rows';

const URGENCY: PipelineSorts = {
  lead: 'urgency',
  active: 'urgency',
  closed: 'urgency',
};

type Move = { id: string; to: Status; at: string };

/**
 * The board's columns with optimistic moves (spec 8.6). The card and the counts move at once;
 * a failure puts them back and says why. `initial` is read once: the board is remounted
 * (keyed by its filters) when the server sends a different set, so a refresh after a move
 * can't undo rows the user has paged in.
 */
export function useBoardMoves(
  initial: Columns,
  onMove: (id: string, to: Status) => Promise<Result<ContactRow>>,
  /** The session ended: the caller sends the user to sign in. */
  onExpired?: () => void,
  /** Each column's sort; a change replaces just that column with `initial`'s first page. */
  sorts: PipelineSorts = URGENCY,
) {
  const [base, setBase] = useState(initial);
  // A column whose sort changed is replaced by the server's first page in the new order; the others keep what was paged in.
  const [seen, setSeen] = useState(sorts);
  if (STATUSES.some((s) => seen[s] !== sorts[s])) {
    setSeen(sorts);
    setBase((b) => {
      const next = { ...b };
      for (const s of STATUSES) if (seen[s] !== sorts[s]) next[s] = initial[s];
      return next;
    });
  }
  const [columns, optimistic] = useOptimistic(base, (state, m: Move) =>
    applyMove(state, m.id, m.to, m.at, sorts[m.to]),
  );
  const [, startTransition] = useTransition();

  function move(id: string, to: Status): Promise<Result<ContactRow>> {
    const name = STATUSES.flatMap((s) => base[s].rows).find(
      (r) => r.id === id,
    )?.fullName;
    return new Promise((resolve) => {
      startTransition(async () => {
        const at = new Date().toISOString();
        optimistic({ id, to, at });
        let result: Result<ContactRow>;
        try {
          result = await onMove(id, to);
        } catch {
          result = fail('server', 'Move failed.');
        }
        if (result.ok) {
          startTransition(() =>
            setBase((b) =>
              applyMove(
                b,
                id,
                to,
                result.ok ? result.data.updatedAt : at,
                sorts[to],
              ),
            ),
          );
          toast.success(`${name ?? 'Contact'} moved to ${STATUS_LABEL[to]}.`);
        } else
          report(
            result.error.code,
            result.error.message,
            () => void move(id, to),
          );
        resolve(result);
      });
    });
  }

  function report(code: string, message: string, retry: () => void) {
    if (code === 'forbidden')
      toast.error("You don't have permission to move contacts.");
    else if (code === 'unauthorized') onExpired?.();
    else if (code === 'not_found') toast.error(message);
    else
      toast.error('Move failed. Retry.', {
        action: { label: 'Retry', onClick: retry },
      });
  }

  // The sorts as of the latest render: a page that comes back after its column changed sort belongs to the old order.
  const latest = useRef(sorts);
  useEffect(() => {
    latest.current = sorts;
  });
  function append(
    status: Status,
    rows: PipelineRow[],
    matching: number,
    /** The sort the page was asked for under. */
    sort: PipelineSort,
  ) {
    if (latest.current[status] !== sort) return;
    setBase((b) => appendRows(b, status, rows, matching, sort));
  }

  return { columns, move, append };
}
