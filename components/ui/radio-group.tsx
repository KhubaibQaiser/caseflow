import type { ChangeEvent } from 'react';

import { optionMark, optionRow } from './checkbox';

type Option = { value: string; label: string };

type RadioGroupProps = {
  legend: string;
  name: string;
  options: readonly Option[];
  value?: string;
  defaultValue?: string;
  onValueChange?(value: string): void;
};

/** Native radios in a fieldset: arrow keys and form submission come from the platform. */
export function RadioGroup({
  legend,
  name,
  options,
  value,
  defaultValue,
  onValueChange,
}: RadioGroupProps) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    onValueChange?.(event.target.value);
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="text-ink-2 mb-1 p-0 text-xs font-semibold">
        {legend}
      </legend>
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
            onChange={onChange}
            className={`${optionMark} size-4 rounded-full checked:border-[5px]`}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
