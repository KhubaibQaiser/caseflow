import { STATUS_LABEL, type Status } from '@/lib/contracts/enums';
import type { FollowUpTone } from '@/lib/dates/labels';

const text = 'inline-block text-xs leading-5 whitespace-nowrap';
// Every pill has a 1px border (transparent unless Lead): 22px tall, and outlined in forced-colours mode.
// Border colour is set per variant, not in the shared class, because two border-colour utilities don't cascade.
const pill = `${text} rounded-pill border px-2 font-semibold`;

const STATUS = {
  lead: 'border-lead-border text-lead-ink',
  active: 'border-transparent bg-accent-soft text-accent',
  closed: 'border-transparent bg-closed-bg text-ink-2',
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`${pill} ${STATUS[status]}`}>{STATUS_LABEL[status]}</span>
  );
}

// Warm colours are reserved for urgency; everything else reads as plain text.
const TONE: Record<FollowUpTone, string> = {
  overdue: `${pill} border-transparent bg-overdue-bg text-overdue`,
  today: `${pill} border-transparent bg-today-bg text-today`,
  later: `${text} text-ink-2`,
  none: `${text} text-ink-2`,
  muted: `${text} text-ink-2`,
};

export function UrgencyPill({
  tone,
  text,
}: {
  tone: FollowUpTone;
  text: string;
}) {
  return <span className={`tnum ${TONE[tone]}`}>{text}</span>;
}
