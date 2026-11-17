'use client';

import { useId, useState } from 'react';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

import { useFieldControl } from './field';
import { controlClass } from './input';

/**
 * Shows an `n / max` counter once the length reaches `counterFrom`
 * (default: the first length past 80% of maxLength; pass 0 to always show it).
 * Uncontrolled, it counts keystrokes; pass a controlled `value` (e.g. RHF `watch`)
 * to keep it right after a programmatic `reset()`.
 */
export function Textarea({
  className,
  maxLength,
  onChange,
  counterFrom,
  ...props
}: ComponentProps<'textarea'> & { counterFrom?: number }) {
  const counterId = useId();
  const [typed, setTyped] = useState(
    String(props.value ?? props.defaultValue ?? '').length,
  );
  const length = props.value === undefined ? typed : String(props.value).length;
  const showCounter =
    maxLength !== undefined &&
    length >= (counterFrom ?? Math.floor(maxLength * 0.8) + 1);
  const field = useFieldControl(
    [props['aria-describedby'], showCounter && counterId]
      .filter(Boolean)
      .join(' ') || undefined,
  );

  return (
    <>
      <textarea
        {...field}
        {...props}
        aria-describedby={field['aria-describedby']}
        maxLength={maxLength}
        onChange={(event) => {
          setTyped(event.target.value.length);
          onChange?.(event);
        }}
        className={cn(
          controlClass,
          'min-h-18 resize-y py-2 leading-relaxed',
          className,
        )}
      />
      {showCounter && (
        <p
          id={counterId}
          className={cn(
            'tnum m-0 text-xs',
            length >= maxLength ? 'text-ink font-semibold' : 'text-ink-2',
          )}
        >
          {length.toLocaleString('en-US')} / {maxLength.toLocaleString('en-US')}
        </p>
      )}
    </>
  );
}
