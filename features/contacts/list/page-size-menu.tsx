'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PAGE_SIZES } from '@/lib/contracts/list-query';

import { useListQuery } from '../url-state';
import { CountButton } from './count-button';

/** The footer's page-size menu, opened from the "1–250 of N" button. Loaded lazily with the Radix menu. */
export function PageSizeMenu({
  from,
  to,
  matching,
}: {
  from: number;
  to: number;
  matching: number;
}) {
  const [query, setQuery] = useListQuery();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CountButton from={from} to={to} matching={matching} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start">
        <DropdownMenuLabel>Rows per page</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(query.size)}
          onValueChange={(v) => {
            const size = PAGE_SIZES.find((n) => String(n) === v);
            if (size) setQuery({ size });
          }}
        >
          {PAGE_SIZES.map((n) => (
            <DropdownMenuRadioItem key={n} value={String(n)}>
              {n} per page
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
