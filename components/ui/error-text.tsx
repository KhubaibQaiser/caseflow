import type { ReactNode } from 'react';
import CircleAlert from 'lucide-react/icons/circle-alert';

/** The inline error line under a field or group: icon plus message, never colour alone. */
export function ErrorText({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      className="text-13 text-overdue m-0 flex items-start gap-1.5 font-medium"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {children}
    </p>
  );
}

/**
 * Props for a group container (fieldset or radiogroup) with an optional error.
 * With an error, tabIndex -1 lets an ErrorSummary link move focus to the group.
 */
export function groupErrorProps(id: string, error?: string) {
  return {
    id,
    tabIndex: error ? -1 : undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  };
}
