import { z } from 'zod';

import type { Activity } from '@/lib/contracts/contact';
import { STATUSES, STATUS_LABEL } from '@/lib/contracts/enums';
import {
  formatDateShort,
  formatTimestamp,
  formatTimestampFull,
} from '@/lib/dates/labels';
import { cn } from '@/utils/cn';

import { Panel } from './panel';

const STATUS_PAYLOAD = z.object({ to: z.enum(STATUSES) });
const FOLLOW_UP_PAYLOAD = z.object({ to: z.iso.date().nullable() });
const FIELDS_PAYLOAD = z.object({ fields: z.array(z.string()).min(1) });

// The payload is jsonb written by a trigger; an unreadable one still gets a sentence.
function describe(a: Activity, today: string): string | null {
  switch (a.type) {
    case 'created':
      return 'created this contact';
    case 'note_added':
      return 'added a note';
    case 'status_changed': {
      const p = STATUS_PAYLOAD.safeParse(a.payload);
      return p.success
        ? `moved this to ${STATUS_LABEL[p.data.to]}`
        : 'changed the status';
    }
    case 'follow_up_changed': {
      const p = FOLLOW_UP_PAYLOAD.safeParse(a.payload);
      if (!p.success) return 'changed the follow-up';
      return p.data.to
        ? `set follow-up to ${formatDateShort(p.data.to, today)}`
        : 'cleared the follow-up';
    }
    case 'updated': {
      const p = FIELDS_PAYLOAD.safeParse(a.payload);
      return p.success
        ? `edited ${p.data.fields.map((f) => f.replace(/_/g, ' ')).join(', ')}`
        : 'edited this contact';
    }
    // Guard-only in the database and unreachable in v1: no copy.
    case 'deleted':
    case 'restored':
      return null;
  }
}

const LIMIT = 100;

/** Newest first, as written by the database triggers. */
export function Timeline({
  activities,
  today,
  tz,
}: {
  activities: Activity[];
  today: string;
  tz: string;
}) {
  const rows = activities.flatMap((a) => {
    const text = describe(a, today);
    return text ? [{ a, text }] : [];
  });
  return (
    <Panel title="Activity">
      {rows.length === 0 ? (
        <p className="text-13 text-ink-2 m-0">No activity yet.</p>
      ) : (
        <ol className="text-13 m-0 list-none p-0">
          {rows.map(({ a, text }) => (
            <li
              key={a.id}
              className="before:bg-line relative flex gap-2.5 pb-3.5 before:absolute before:top-3 before:bottom-0 before:left-1 before:w-px last:pb-0 last:before:hidden"
            >
              <span
                aria-hidden
                className={cn(
                  'border-accent mt-1 size-[9px] flex-none rounded-full border-2',
                  a.type === 'created' ? 'bg-accent' : 'bg-surface',
                )}
              />
              <div className="min-w-0">
                <p className="text-ink m-0 font-normal wrap-anywhere">
                  <span className="font-semibold">{a.actor.name}</span> {text}
                </p>
                <time
                  dateTime={a.createdAt}
                  title={formatTimestampFull(a.createdAt, tz)}
                  className="text-ink-2 tnum block text-xs"
                >
                  {formatTimestamp(a.createdAt, tz)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
      {activities.length >= LIMIT && (
        <p className="text-ink-2 mt-3 mb-0 text-xs">
          Showing the latest {LIMIT}.
        </p>
      )}
    </Panel>
  );
}
