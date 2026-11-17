'use client';

import { Suspense, lazy, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { UrgencyPill } from '@/components/ui/pill';
import { usePermission } from '@/lib/auth/permissions-context';
import type { ContactRow } from '@/lib/contracts/contact';
import type { Result } from '@/lib/contracts/result';
import { followUpView, formatDateShort } from '@/lib/dates/labels';

import { VIEWER_EDIT_REASON } from '../reasons';
import { Panel } from './panel';

// The calendar (react-day-picker) is a third of the route's JS and only a click away from needed.
const load = () => import('@/components/ui/date-picker');
const DatePicker = lazy(() => load().then((m) => ({ default: m.DatePicker })));

type FollowUpCardProps = {
  contact: Pick<
    ContactRow,
    'status' | 'followUpOn' | 'urgency' | 'daysOverdue'
  >;
  today: string;
  /** Saves as soon as a day is picked; `null` clears the follow-up. */
  onReschedule(followUpOn: string | null): Promise<Result<ContactRow>>;
};

export function FollowUpCard({
  contact,
  today,
  onReschedule,
}: FollowUpCardProps) {
  const canWrite = usePermission('contacts.write');
  const [pending, setPending] = useState(false);
  // Set by the first click: the picker mounts already open once its code lands.
  const [armed, setArmed] = useState(false);
  const inflight = useRef(false);
  const { followUpOn, status } = contact;
  const view = followUpView(contact, today);
  const date = followUpOn ? formatDateShort(followUpOn, today) : null;
  const urgent = view.tone === 'overdue' || view.tone === 'today';
  // Closed rows keep their date but are never flagged, so say it is only history.
  const lead = followUpOn && followUpOn < today ? 'Was due' : 'Due';
  const pill = !followUpOn
    ? 'No follow-up set'
    : urgent
      ? view.text
      : `${lead} ${view.text}`;

  async function save(next: string | null) {
    if (inflight.current) return;
    inflight.current = true;
    setPending(true);
    try {
      await onReschedule(next);
    } finally {
      inflight.current = false;
      setPending(false);
    }
  }

  const reschedule = (busy: boolean, onClick?: () => void) => (
    <Button
      variant="ghost"
      size="sm"
      pending={busy}
      pendingLabel="Saving…"
      onClick={onClick}
      onPointerEnter={() => void load()}
      onFocus={() => void load()}
    >
      Reschedule
    </Button>
  );

  return (
    <Panel title="Follow-up">
      <div className="text-13 flex flex-wrap items-center gap-x-3 gap-y-2">
        <UrgencyPill tone={followUpOn ? view.tone : 'none'} text={pill} />
        {urgent && date && <span className="tnum">Due {date}</span>}
        <div className="ml-auto">
          {canWrite ? (
            armed ? (
              <Suspense fallback={reschedule(true)}>
                <DatePicker
                  defaultOpen
                  label="Follow-up date"
                  value={followUpOn}
                  min={today}
                  onChange={(next) => void save(next)}
                  trigger={reschedule(pending)}
                />
              </Suspense>
            ) : (
              reschedule(false, () => setArmed(true))
            )
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabledReason={VIEWER_EDIT_REASON}
            >
              Reschedule
            </Button>
          )}
        </div>
      </div>
      {status === 'closed' && followUpOn && (
        <p className="text-ink-2 mt-2 mb-0 text-xs">
          Closed contacts aren&apos;t flagged overdue.
        </p>
      )}
    </Panel>
  );
}
