import Link from 'next/link';
import { memo } from 'react';

import { PhoneLink } from '@/components/ui/phone-link';
import { StatusPill, UrgencyPill } from '@/components/ui/pill';

import { matterLabel } from './columns';
import type { ListRow } from './list-rows';

/** One contact on the phone card list: the name and urgency, then matter, status and phone. */
export const ContactCard = memo(function ContactCard({
  row: r,
}: {
  row: ListRow;
}) {
  return (
    <>
      <div className="flex items-center gap-x-3">
        {/* The link's ::after covers the card, so the whole card is the target. */}
        <Link
          href={`/contacts/${r.id}`}
          prefetch={false}
          title={r.fullName}
          className="text-ink min-w-0 flex-1 truncate text-sm leading-6 font-semibold no-underline after:absolute after:inset-0 focus-visible:shadow-none focus-visible:-outline-offset-2"
        >
          {r.fullName}
        </Link>
        <span className="shrink-0">
          <UrgencyPill {...r.followUp} />
        </span>
      </div>
      <span className="text-ink-2 flex min-w-0 items-center gap-2">
        <span className="truncate">{matterLabel(r)}</span>
        <StatusPill status={r.status} />
        {r.phone ? (
          <PhoneLink phone={r.phone} />
        ) : (
          <span className="shrink-0">No phone</span>
        )}
      </span>
    </>
  );
});
