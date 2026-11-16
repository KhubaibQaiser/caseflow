'use client';

import ArrowUpDown from 'lucide-react/icons/arrow-up-down';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useListQuery } from '../url-state';
import { SORT_OPTIONS } from './columns';

/** Below 768px, standing in for the clickable column headers. */
export function SortMenu({ className }: { className?: string }) {
  const [query, setQuery] = useListQuery();
  const current = SORT_OPTIONS.find((o) => o.key === query.sort);
  const value = `${query.sort}:${query.dir}`;
  // `updated` has no header, so it reads as a plain "Sort" until one is picked.
  const label = current
    ? `Sort: ${current.label}, ${query.dir === 'asc' ? current.asc : current.desc}`
    : 'Sort';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label={label} className={className}>
          <ArrowUpDown aria-hidden className="size-4" />
          {current ? `Sort: ${current.label}` : 'Sort'}
        </Button>
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
