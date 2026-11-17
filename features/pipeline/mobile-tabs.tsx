'use client';

import { Segmented } from '@/components/ui/segmented';
import { STATUSES, STATUS_LABEL } from '@/lib/contracts/enums';
import type { Status } from '@/lib/contracts/enums';
import { PIPELINE_SORT_LABEL } from '@/lib/contracts/pipeline-sort';
import type {
  PipelineSorts,
  PipelineSort,
} from '@/lib/contracts/pipeline-sort';

import type { Columns } from './rows';
import { SortControl } from './sort-control';

/** Below 768px the board shows one column at a time; the counts keep the other two in view. */
export function MobileTabs({
  columns,
  value,
  onChange,
  sorts,
  onSortChange,
}: {
  columns: Columns;
  value: Status;
  onChange(status: Status): void;
  sorts: PipelineSorts;
  onSortChange(status: Status, sort: PipelineSort): void;
}) {
  return (
    <div className="md:hidden">
      <div className="flex items-center gap-2">
        {/* The control is a full-width row on a phone (screens-v1.html). */}
        <div className="min-w-0 flex-1 [&_[role=radiogroup]]:w-full [&_[role=radiogroup]]:self-stretch [&_label]:min-h-9 [&_label]:flex-1 [&_label]:justify-center [&>div]:self-stretch">
          <Segmented
            label="Status"
            hideLabel
            name="pipeline-status"
            value={value}
            onValueChange={(v) => {
              const s = STATUSES.find((x) => x === v);
              if (s) onChange(s);
            }}
            options={STATUSES.map((s) => ({
              value: s,
              label: STATUS_LABEL[s],
              count: columns[s].matching,
            }))}
          />
        </div>
        <SortControl
          status={value}
          sort={sorts[value]}
          onChange={(sort) => onSortChange(value, sort)}
          iconOnly
          className="border-line bg-surface"
        />
      </div>
      <p className="text-ink-2 text-13 m-0 mt-2">
        {STATUS_LABEL[value]} sorted by{' '}
        <span className="text-ink font-semibold">
          {PIPELINE_SORT_LABEL[sorts[value]]}
        </span>
      </p>
    </div>
  );
}
