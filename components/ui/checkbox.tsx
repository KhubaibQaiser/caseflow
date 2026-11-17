import type { ComponentProps } from 'react';
import Check from 'lucide-react/icons/check';

import { cn } from '@/utils/cn';

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  label: string;
  count?: number;
};

export const optionRow =
  'flex min-h-7 cursor-pointer items-center gap-2 text-13 text-ink has-disabled:cursor-not-allowed has-disabled:opacity-45';

export const optionMark =
  'shrink-0 cursor-[inherit] appearance-none border-[1.5px] border-control-border bg-surface transition-colors duration-150 checked:border-accent group-aria-invalid:not-checked:border-overdue';

/** Native checkbox; the whole row is the click target. */
export function Checkbox({ label, count, className, ...props }: CheckboxProps) {
  return (
    <label className={optionRow}>
      <span className="relative grid size-4 shrink-0 place-items-center">
        <input
          type="checkbox"
          className={cn(
            optionMark,
            'peer checked:bg-accent size-4 rounded-[4px] forced-colors:checked:border-[Highlight] forced-colors:checked:bg-[Highlight] forced-colors:checked:forced-color-adjust-none',
            className,
          )}
          {...props}
        />
        <Check
          aria-hidden
          strokeWidth={3}
          className="text-on-accent pointer-events-none absolute hidden size-3 peer-checked:block forced-colors:text-[HighlightText] forced-colors:forced-color-adjust-none"
        />
      </span>
      {label}{' '}
      {count !== undefined && (
        <span className="tnum text-ink-2 ml-auto">
          {count.toLocaleString('en-US')}
        </span>
      )}
    </label>
  );
}
