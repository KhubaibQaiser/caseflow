'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { STATUS_LABEL } from '@/lib/contracts/enums';
import type { Status } from '@/lib/contracts/enums';
import {
  DEFAULT_PIPELINE_SORT,
  PIPELINE_SORTS,
  PIPELINE_SORT_LABEL,
} from '@/lib/contracts/pipeline-sort';
import type { PipelineSort } from '@/lib/contracts/pipeline-sort';
import { PipelineSortSchema } from '@/lib/contracts/pipeline-sort-schema';

import { SortButton } from './sort-button';

/** Radix menu + floating-ui: loaded lazily by SortControl, so it stays out of first load. */
export default function SortMenu({
  status,
  sort,
  onChange,
  iconOnly,
  className,
  defaultOpen = false,
}: {
  status: Status;
  sort: PipelineSort;
  onChange(sort: PipelineSort): void;
  iconOnly?: boolean;
  className?: string;
  /** Set when the stand-in was clicked while this code was loading. */
  defaultOpen?: boolean;
}) {
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger asChild>
        <SortButton
          status={status}
          sort={sort}
          iconOnly={iconOnly}
          className={className}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>Sort {STATUS_LABEL[status]} by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sort}
          onValueChange={(v) => {
            const r = PipelineSortSchema.safeParse(v);
            if (r.success) onChange(r.data);
          }}
        >
          {PIPELINE_SORTS.map((s) => (
            <DropdownMenuRadioItem
              key={s}
              value={s}
              className="max-md:min-h-10"
            >
              {PIPELINE_SORT_LABEL[s]}
              {s === DEFAULT_PIPELINE_SORT && (
                <span className="text-ink-2 ml-auto pl-3 text-xs font-normal">
                  Default
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
