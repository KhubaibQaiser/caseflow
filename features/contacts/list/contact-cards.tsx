import Link from 'next/link';

import { PhoneLink } from '@/components/ui/phone-link';
import { StatusPill, UrgencyPill } from '@/components/ui/pill';
import { cn } from '@/utils/cn';

import { matterLabel } from './columns';
import type { ListRow } from './list-rows';

type ContactCardsProps = {
  rows: ListRow[];
  /** Rows before this page, for each card's position in the whole set. */
  offset: number;
  matching?: number;
  className?: string;
};

/**
 * Below 768px. Not virtualized: content-visibility skips layout and paint for
 * off-screen cards, which keeps 500 of them smooth without JS.
 */
export function ContactCards({
  rows,
  offset,
  matching,
  className,
}: ContactCardsProps) {
  return (
    <ul
      aria-label="Contacts"
      tabIndex={-1}
      data-results-focus
      className={cn(
        'border-line bg-surface rounded-surface divide-line-soft tnum m-0 list-none divide-y overflow-hidden border p-0 outline-none',
        className,
      )}
    >
      {rows.map((r, i) => (
        <li
          key={r.id}
          aria-posinset={matching ? offset + i + 1 : undefined}
          aria-setsize={matching}
          className="hover:bg-panel text-13 relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-[3px] px-3 py-2.5 [contain-intrinsic-size:auto_51px] [content-visibility:auto]"
        >
          {/* The link's ::after covers the card, so the whole card is the target.
              Intrinsic size is the content box of a 72px card (less 20px padding and the 1px divider):
              a larger guess shrinks the page as cards render and leaves blank ground at the end. */}
          <Link
            href={`/contacts/${r.id}`}
            prefetch={false}
            title={r.fullName}
            className="text-ink block truncate text-sm leading-6 font-semibold no-underline after:absolute after:inset-0 focus-visible:shadow-none focus-visible:-outline-offset-2"
          >
            {r.fullName}
          </Link>
          <UrgencyPill {...r.followUp} />
          <span className="text-ink-2 col-span-2 flex min-w-0 items-center gap-2">
            <span className="truncate">{matterLabel(r)}</span>
            <StatusPill status={r.status} />
            {r.phone ? (
              <PhoneLink phone={r.phone} />
            ) : (
              <span className="shrink-0">No phone</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
