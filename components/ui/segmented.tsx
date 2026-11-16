'use client';

import type { ChangeEvent, FocusEvent } from 'react';

import { cn } from '@/utils/cn';

import { ErrorText, groupErrorProps } from './error-text';

type Option = {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
};

type SegmentedProps = {
  /** Group id for ErrorSummary links; defaults to `name`. */
  id?: string;
  label: string;
  /** Keep the label for screen readers only (e.g. a toolbar with its own context). */
  hideLabel?: boolean;
  error?: string;
  name: string;
  options: readonly Option[];
  value?: string;
  defaultValue?: string;
  onValueChange?(value: string): void;
  onBlur?(event: FocusEvent<HTMLInputElement>): void;
};

/**
 * One-of-few choice. Visually hidden native radios inside role="radiogroup",
 * so arrow keys move and select, and the value submits with the form.
 */
export function Segmented({
  id,
  label,
  hideLabel = false,
  error,
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  onBlur,
}: SegmentedProps) {
  const groupId = id ?? name;
  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    onValueChange?.(event.target.value);
  return (
    <div className="flex flex-col gap-1.5 self-start">
      <span
        id={`${groupId}-label`}
        className={cn('text-13 text-ink font-semibold', hideLabel && 'sr-only')}
      >
        {label}
      </span>
      <div
        {...groupErrorProps(groupId, error)}
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        className="bg-track inline-flex gap-0.5 self-start rounded-lg p-[3px] aria-invalid:shadow-[0_0_0_1px_var(--overdue),0_0_0_4px_var(--error-ring)] forced-colors:aria-invalid:outline-2 forced-colors:aria-invalid:outline-solid"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="text-13 text-ink-2 has-enabled:hover:text-ink has-checked:border-ink-2 has-checked:bg-surface has-checked:text-ink has-checked:shadow-raised has-focus-visible:outline-accent flex min-h-7 cursor-pointer items-center gap-1.5 rounded-[5px] border border-transparent px-3.5 font-medium transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-45 forced-colors:has-checked:border-[Highlight] forced-colors:has-checked:bg-[Highlight] forced-colors:has-checked:text-[HighlightText] forced-colors:has-checked:forced-color-adjust-none"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === undefined ? undefined : value === option.value}
              defaultChecked={
                defaultValue === undefined
                  ? undefined
                  : defaultValue === option.value
              }
              disabled={option.disabled}
              onChange={onChange}
              onBlur={onBlur}
              className="sr-only"
            />
            {option.label}
            {option.count !== undefined && (
              <span className="tnum text-ink-2 forced-colors:text-inherit">
                {option.count.toLocaleString('en-US')}
              </span>
            )}
          </label>
        ))}
      </div>
      {error && <ErrorText id={`${groupId}-error`}>{error}</ErrorText>}
    </div>
  );
}
