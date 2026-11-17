'use client';

import type { ChangeEvent, FocusEvent } from 'react';

import { optionMark, optionRow } from './checkbox';
import { legendClass } from './checkbox-group';
import { ErrorText, groupErrorProps } from './error-text';

type Option = { value: string; label: string; disabled?: boolean };

type RadioGroupProps = {
  /** Group id for ErrorSummary links; defaults to `name`. */
  id?: string;
  legend: string;
  error?: string;
  name: string;
  options: readonly Option[];
  value?: string;
  defaultValue?: string;
  onValueChange?(value: string): void;
  onBlur?(event: FocusEvent<HTMLInputElement>): void;
};

/** Native radios in a fieldset: arrow keys and form submission come from the platform. */
export function RadioGroup({
  id,
  legend,
  error,
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  onBlur,
}: RadioGroupProps) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    onValueChange?.(event.target.value);
  return (
    <fieldset
      {...groupErrorProps(id ?? name, error)}
      className="group m-0 border-0 p-0"
    >
      <legend className={legendClass}>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={optionRow}>
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
            className={`${optionMark} size-4 rounded-full checked:border-5`}
          />
          {option.label}
        </label>
      ))}
      {error && <ErrorText id={`${id ?? name}-error`}>{error}</ErrorText>}
    </fieldset>
  );
}
