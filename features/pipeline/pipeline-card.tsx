import Link from 'next/link';
import type { ReactNode } from 'react';

import { PhoneLink } from '@/components/ui/phone-link';
import { UrgencyPill } from '@/components/ui/pill';
import { MATTER_TYPE_LABEL } from '@/lib/contracts/enums';
import type { ContactRow } from '@/lib/contracts/contact';
import type { Status } from '@/lib/contracts/enums';
import type { Result } from '@/lib/contracts/result';

import { MoveMenu } from '../contacts/detail/move-menu';
import { followUpOf } from './rows';
import type { PipelineRow } from './rows';

export type PipelineCardProps = {
  row: PipelineRow;
  onMove(id: string, to: Status): Promise<Result<ContactRow>>;
  /** Blocks Move to… (still focusable) and says why. */
  disabledReason?: string;
  /** Where dragging attaches (ADR-0014). */
  cardRef?: (el: Element | null) => void;
  /** Lifted by a drag: the card stays as an outlined slot while its copy moves. */
  dragging?: boolean;
  /** The keyboard Drag button, after the Move menu in tab order. */
  dragHandle?: ReactNode;
};

/** Name link, urgency, "matter · phone" and the Move to… menu. The whole card opens the contact; the menu and phone sit above it. */
export function PipelineCard({
  row,
  onMove,
  disabledReason,
  cardRef,
  dragging = false,
  dragHandle,
}: PipelineCardProps) {
  const { tone, text } = followUpOf(row);
  return (
    <li
      ref={cardRef}
      data-card={row.id}
      data-dragging={dragging || undefined}
      className="border-line bg-surface hover:border-lead-border data-dragging:border-lead-border data-dragging:bg-track relative flex flex-col gap-1 rounded-lg border px-3 py-2.5 data-dragging:border-dashed"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <Link
          href={`/contacts/${row.id}`}
          prefetch={false}
          data-card-link
          title={row.fullName}
          className="text-ink min-w-0 flex-[1_1_6rem] truncate text-sm leading-6 font-semibold no-underline after:absolute after:inset-0 focus-visible:shadow-none focus-visible:-outline-offset-2"
        >
          {row.fullName}
        </Link>
        <UrgencyPill tone={tone} text={text} />
      </div>
      <p className="text-ink-2 text-13 tnum m-0 flex min-w-0 items-center gap-1.5">
        <span className="truncate">{MATTER_TYPE_LABEL[row.matterType]}</span>
        <span aria-hidden>·</span>
        {row.phone ? (
          <PhoneLink phone={row.phone} />
        ) : (
          <span className="shrink-0">No phone</span>
        )}
      </p>
      <MoveMenu
        current={row.status}
        onMove={(to) => onMove(row.id, to)}
        disabledReason={disabledReason}
        align="start"
        className="relative z-1 mt-1 h-7 self-start px-2 text-xs max-md:h-9"
      />
      {dragHandle}
    </li>
  );
}
