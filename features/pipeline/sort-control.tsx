'use client';

import { Suspense, lazy, useState } from 'react';

import type { Status } from '@/lib/contracts/enums';
import type { PipelineSort } from '@/lib/contracts/pipeline-sort';

import { SortButton } from './sort-button';

/** Starts loading the menu code; the stand-in calls it on hover and focus. */
export const preloadSortMenu = () => import('./sort-menu');
const SortMenu = lazy(preloadSortMenu);

/** A column's sort button and menu. A click before the menu's code arrives opens it as soon as it mounts. */
export function SortControl({
  status,
  sort,
  onChange,
  iconOnly,
  className,
}: {
  status: Status;
  sort: PipelineSort;
  onChange(sort: PipelineSort): void;
  iconOnly?: boolean;
  className?: string;
}) {
  const [wantOpen, setWantOpen] = useState(false);
  return (
    <Suspense
      fallback={
        <SortButton
          status={status}
          sort={sort}
          iconOnly={iconOnly}
          className={className}
          onPointerEnter={() => void preloadSortMenu()}
          onFocus={() => void preloadSortMenu()}
          onClick={() => setWantOpen(true)}
        />
      }
    >
      <SortMenu
        status={status}
        sort={sort}
        onChange={onChange}
        iconOnly={iconOnly}
        className={className}
        defaultOpen={wantOpen}
      />
    </Suspense>
  );
}
