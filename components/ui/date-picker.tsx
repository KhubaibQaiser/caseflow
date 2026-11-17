'use client';

import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { DayPicker } from 'react-day-picker';
import type { ChevronProps } from 'react-day-picker';
import CalendarDays from 'lucide-react/icons/calendar-days';
import ChevronLeft from 'lucide-react/icons/chevron-left';
import ChevronRight from 'lucide-react/icons/chevron-right';

import { parseDateOnly, toDateOnly } from '@/lib/dates/date-only';
import { formatDateShort } from '@/lib/dates/labels';
import { cn } from '@/utils/cn';

import { Button } from './button';
import { useFieldControl } from './field';
import { controlClass } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type DatePickerProps = {
  value: string | null;
  onChange(value: string | null): void;
  /** Earliest pickable day, 'YYYY-MM-DD'. */
  min?: string;
  /** Names the calendar, and the field trigger as "label: value"; match the visible field label. */
  label: string;
  /** A button to open the calendar instead of the field (e.g. Reschedule). It keeps its own name. */
  trigger?: ReactElement;
  /** Start with the calendar open: for a picker mounted lazily by the click that should open it. */
  defaultOpen?: boolean;
};

const navButton =
  'grid size-8 cursor-pointer place-items-center rounded-ctl text-ink-2 transition-colors duration-150 hover:bg-track hover:text-ink aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:bg-transparent';

function Chevron({ orientation }: ChevronProps) {
  const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
  return <Icon aria-hidden className="size-4" />;
}

/** A month calendar in a popover, opened by a field (default) or your own button. Values are date-only strings, never ISO timestamps. */
export function DatePicker({
  value,
  onChange,
  min,
  label,
  trigger,
  defaultOpen = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panel = useRef<HTMLDivElement>(null);
  const field = useFieldControl();
  const selected = value ? parseDateOnly(value) : undefined;
  const minDate = min ? parseDateOnly(min) : undefined;
  // ponytail: "today" is the render clock, so a server/browser year boundary could differ for a moment on Dec 31.
  const display = value
    ? formatDateShort(value, toDateOnly(new Date()))
    : 'Pick a date';

  const commit = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            {...field}
            // A required button isn't valid ARIA; the Field's label already says Required.
            aria-required={undefined}
            aria-label={`${label}: ${display}`}
            className={cn(
              controlClass,
              'data-[state=open]:border-accent flex h-9 cursor-pointer items-center justify-between gap-2 text-left',
            )}
          >
            <span className={cn('tnum truncate', !value && 'text-ink-2')}>
              {display}
            </span>
            <CalendarDays aria-hidden className="text-ink-2 size-4 shrink-0" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        ref={panel}
        aria-label={label}
        className="w-max"
        // Start on the day DayPicker marks as its tab stop (selected, else today, else first enabled).
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          panel.current
            ?.querySelector<HTMLButtonElement>('button[tabindex="0"]')
            ?.focus();
        }}
      >
        <DayPicker
          mode="single"
          required
          selected={selected}
          defaultMonth={selected ?? minDate}
          startMonth={minDate}
          disabled={minDate && { before: minDate }}
          onSelect={(date: Date) => commit(toDateOnly(date))}
          components={{ Chevron }}
          classNames={{
            root: 'text-13 text-ink relative',
            month_caption: 'flex h-8 items-center pl-2 text-sm font-semibold',
            nav: 'absolute top-0 right-0 flex gap-0.5',
            button_previous: navButton,
            button_next: navButton,
            month_grid: 'mt-1 border-collapse',
            weekday: 'h-8 w-9 p-0 text-xs font-medium text-ink-2',
            day: 'group p-0',
            day_button: cn(
              'tnum grid size-9 cursor-pointer place-items-center rounded-ctl transition-colors duration-150 hover:bg-track',
              'group-data-today:font-bold group-data-today:underline group-data-today:decoration-2 group-data-today:underline-offset-[5px]',
              'group-data-selected:bg-accent group-data-selected:text-on-accent group-data-selected:hover:bg-accent-hover',
              'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent',
              'forced-colors:group-data-selected:bg-[Highlight] forced-colors:group-data-selected:text-[HighlightText] forced-colors:group-data-selected:forced-color-adjust-none',
            ),
            hidden: 'invisible',
          }}
        />
        {value && (
          <div className="border-line-soft mt-2 flex justify-end border-t pt-2">
            <Button variant="ghost" size="sm" onClick={() => commit(null)}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
