import ArrowUpDown from 'lucide-react/icons/arrow-up-down';
import type { ComponentProps } from 'react';

import { STATUS_LABEL } from '@/lib/contracts/enums';
import type { Status } from '@/lib/contracts/enums';
import {
  DEFAULT_PIPELINE_SORT,
  PIPELINE_SORT_LABEL,
} from '@/lib/contracts/pipeline-sort';
import type { PipelineSort } from '@/lib/contracts/pipeline-sort';
import { cn } from '@/utils/cn';

/**
 * A column's sort trigger, and its stand-in while the menu code loads. The default order is a plain icon;
 * any other is an outlined chip that says which (text and border, not colour alone). `iconOnly` keeps the
 * chip's border without its text, for the phone's single button (the line under the tabs says it in words).
 */
export function SortButton({
  status,
  sort,
  iconOnly = false,
  className,
  ...rest
}: {
  status: Status;
  sort: PipelineSort;
  iconOnly?: boolean;
} & Omit<ComponentProps<'button'>, 'aria-label'>) {
  const active = sort !== DEFAULT_PIPELINE_SORT;
  const text = PIPELINE_SORT_LABEL[sort];
  return (
    <button
      type="button"
      {...rest}
      aria-label={`Sort ${STATUS_LABEL[status]}: ${text}`}
      className={cn(
        'text-13 rounded-ctl flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 border font-medium',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : cn(
              'text-ink-2 hover:bg-track hover:text-ink data-[state=open]:bg-track',
              iconOnly ? 'border-line bg-surface' : 'border-transparent',
            ),
        active && !iconOnly ? 'px-2' : 'w-7',
        iconOnly && 'max-md:size-10',
        className,
      )}
    >
      <ArrowUpDown aria-hidden className="size-4" />
      {active && !iconOnly && text}
    </button>
  );
}
