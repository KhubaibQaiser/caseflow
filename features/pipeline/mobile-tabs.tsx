'use client';

import { Segmented } from '@/components/ui/segmented';
import { STATUSES, STATUS_LABEL } from '@/lib/contracts/enums';
import type { Status } from '@/lib/contracts/enums';

import type { Columns } from './rows';

/** Below 768px the board shows one column at a time; the counts keep the other two in view. */
export function MobileTabs({
  columns,
  value,
  onChange,
}: {
  columns: Columns;
  value: Status;
  onChange(status: Status): void;
}) {
  return (
    // The control is a full-width row on a phone (screens-v1.html).
    <div className="md:hidden [&_[role=radiogroup]]:w-full [&_[role=radiogroup]]:self-stretch [&_label]:min-h-9 [&_label]:flex-1 [&_label]:justify-center [&_label]:px-2 [&>div]:self-stretch">
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
  );
}
