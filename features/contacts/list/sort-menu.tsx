'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useListQuery } from '../url-state';
import { SORT_OPTIONS, sortLabel } from './columns';
import { SortButton } from './sort-button';

/** Below 768px, standing in for the clickable column headers. Loaded lazily by the toolbar. */
export function SortMenu({ className }: { className?: string }) {
  const [query, setQuery] = useListQuery();
  const value = `${query.sort}:${query.dir}`;
  const label = sortLabel(query.sort, query.dir);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SortButton label={label} className={className} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => {
            const option = SORT_OPTIONS.find((o) => v.startsWith(`${o.key}:`));
            if (option)
              setQuery({
                sort: option.key,
                dir: v.endsWith(':desc') ? 'desc' : 'asc',
              });
          }}
        >
          {SORT_OPTIONS.flatMap((o) =>
            (['asc', 'desc'] as const).map((dir) => (
              <DropdownMenuRadioItem
                key={`${o.key}:${dir}`}
                value={`${o.key}:${dir}`}
              >
                {o.label}, {o[dir]}
              </DropdownMenuRadioItem>
            )),
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
