'use client';

import X from 'lucide-react/icons/x';

type ChipProps = { label: string; value: string; onRemove(): void };

/**
 * An active filter. The remove button is a 24px target.
 * The chip unmounts on removal, so the consumer must move focus (to the next chip, or the Filters button).
 */
export function Chip({ label, value, onRemove }: ChipProps) {
  return (
    <span className="rounded-pill border-line bg-surface text-13 text-ink inline-flex h-7 items-center gap-0.5 border pr-0.5 pl-2.5">
      <b className="font-semibold">{label}:</b>&nbsp;{value}
      <button
        type="button"
        aria-label={`Remove ${label} filter`}
        onClick={onRemove}
        className="text-ink-2 hover:bg-track hover:text-ink grid size-6 cursor-pointer place-items-center rounded-full transition-colors duration-150"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </span>
  );
}
