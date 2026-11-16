import type { ReactNode } from 'react';

import { ErrorText, groupErrorProps } from './error-text';

type CheckboxGroupProps = {
  id: string;
  legend: string;
  error?: string;
  children: ReactNode;
};

export const legendClass = 'mb-1 p-0 text-xs font-semibold text-ink-2';

/** A fieldset of Checkboxes; an error marks the group and every unchecked box. */
export function CheckboxGroup({
  id,
  legend,
  error,
  children,
}: CheckboxGroupProps) {
  return (
    <fieldset
      {...groupErrorProps(id, error)}
      className="group m-0 border-0 p-0"
    >
      <legend className={legendClass}>{legend}</legend>
      {children}
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </fieldset>
  );
}
