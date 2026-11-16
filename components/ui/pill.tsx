import { STATUS_LABEL, type Status } from '@/lib/contracts/enums';
import type { FollowUpTone } from '@/lib/dates/labels';
import { cn } from '@/utils/cn';

const text = 'inline-block text-xs leading-5 whitespace-nowrap';
// A 1px border on every pill: 22px tall, and outlined in forced-colours mode.
const pill = `${text} rounded-pill border border-transparent px-2 font-semibold`;

const STATUS = {
  lead: 'border-lead-border text-lead-ink',
  active: 'bg-accent-soft text-accent',
  closed: 'bg-closed-bg text-ink-2',
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={cn(pill, STATUS[status])}>{STATUS_LABEL[status]}</span>
  );
}

// Warm colours are reserved for urgency; everything else reads as plain text.
const TONE: Record<FollowUpTone, string> = {
  overdue: `${pill} bg-overdue-bg text-overdue`,
  today: `${pill} bg-today-bg text-today`,
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
