'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import { toast } from '@/components/ui/toaster';
import type { ContactDetail, ContactRow, Note } from '@/lib/contracts/contact';
import { STATUS_LABEL, type Status } from '@/lib/contracts/enums';
import type { Result } from '@/lib/contracts/result';
import type { RichDoc } from '@/lib/contracts/rich-text-core';
import { formatDateShort } from '@/lib/dates/labels';

import { attempt, useReportFailure } from './action-result';
import { ContactHeader } from './contact-header';
import { DetailsList } from './details-list';
import { FollowUpCard } from './follow-up-card';
import { Notes } from './notes';

type ContactDetailViewProps = {
  contact: ContactDetail;
  today: string;
  tz: string;
  /** The Server Actions, already bound to this contact's id. */
  onMove(to: Status): Promise<Result<ContactRow>>;
  onReschedule(followUpOn: string | null): Promise<Result<ContactRow>>;
  onAddNote(doc: RichDoc): Promise<Result<Note>>;
  /** The activity timeline, rendered on the server so its parsing never ships to the browser. */
  timeline: ReactNode;
  /** The phone in its display format, formatted on the server. */
  phoneText?: string;
};

/** The page body. Moves and reschedules show at once from the action's reply; the revalidated page replaces them. */
export function ContactDetailView({
  contact,
  today,
  tz,
  onMove,
  onReschedule,
  onAddNote,
  timeline,
  phoneText,
}: ContactDetailViewProps) {
  const report = useReportFailure();
  // Valid only while the server copy it was derived from is still the one rendered.
  const [saved, setSaved] = useState<{ from: string; row: ContactRow } | null>(
    null,
  );
  const live: ContactDetail = {
    ...contact,
    ...(saved?.from === contact.updatedAt ? saved.row : null),
  };

  async function move(to: Status): Promise<Result<ContactRow>> {
    const r = await attempt(() => onMove(to), 'move this contact');
    if (r.ok) {
      setSaved({ from: contact.updatedAt, row: r.data });
      toast.success(`${contact.fullName} moved to ${STATUS_LABEL[to]}.`);
    } else report(r.error, 'move contacts', () => void move(to));
    return r;
  }

  async function reschedule(next: string | null): Promise<Result<ContactRow>> {
    const r = await attempt(() => onReschedule(next), 'save the follow-up');
    if (r.ok) {
      setSaved({ from: contact.updatedAt, row: r.data });
      toast.success(
        next
          ? `Follow-up set to ${formatDateShort(next, today)}.`
          : 'Follow-up cleared.',
      );
    } else
      report(r.error, 'reschedule follow-ups', () => void reschedule(next));
    return r;
  }

  return (
    <>
      <ContactHeader contact={live} today={today} tz={tz} onMove={move} />
      <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <FollowUpCard
            contact={live}
            today={today}
            onReschedule={reschedule}
          />
          <DetailsList contact={live} phoneText={phoneText} />
          <Notes notes={contact.notes} onAdd={onAddNote} tz={tz} />
        </div>
        {timeline}
      </div>
    </>
  );
}
