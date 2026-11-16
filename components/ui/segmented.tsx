import type { ChangeEvent } from 'react';

type Option = { value: string; label: string; count?: number };

type SegmentedProps = {
  label: string;
  name: string;
  options: readonly Option[];
  value?: string;
  defaultValue?: string;
  onValueChange?(value: string): void;
};

/**
 * One-of-few choice. Visually hidden native radios inside role="radiogroup",
 * so arrow keys move and select, and the value submits with the form.
 */
export function Segmented({
  label,
  name,
  options,
  value,
  defaultValue,
  onValueChange,
}: SegmentedProps) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    onValueChange?.(event.target.value);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="bg-track inline-flex gap-0.5 self-start rounded-lg p-[3px]"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="text-13 text-ink-2 hover:text-ink has-checked:bg-surface has-checked:text-ink has-checked:shadow-raised has-focus-visible:outline-accent flex min-h-7 cursor-pointer items-center gap-1.5 rounded-[5px] px-3.5 font-medium transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-45"
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
            onChange={onChange}
            className="sr-only"
          />
          {option.label}
          {option.count !== undefined && (
            <span className="tnum text-ink-2">
              {option.count.toLocaleString('en-US')}
            </span>
          )}
        </label>
      ))}
    </div>
  );
}
