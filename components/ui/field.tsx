'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import CircleAlert from 'lucide-react/icons/circle-alert';

import { ErrorText } from './error-text';

type FieldState = {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
};

const FieldContext = createContext<FieldState | null>(null);

/** Control props supplied by the surrounding Field (id, aria-*). */
export function useFieldControl(describedBy?: string) {
  const field = useContext(FieldContext);
  const ids = [field?.describedBy, describedBy].filter(Boolean).join(' ');
  return {
    id: field?.id,
    'aria-invalid': field?.invalid || undefined,
    'aria-required': field?.required || undefined,
    'aria-describedby': ids || undefined,
  };
}

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  /** A note in the required slot when the rule is conditional (e.g. "required if no phone"); does not set aria-required. */
  requiredNote?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
};

export function Field({
  id,
  label,
  required = false,
  requiredNote,
  hint,
  error,
  children,
}: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-13 text-ink font-semibold">
        {label}
        {(required || requiredNote) && (
          <span
            aria-hidden="true"
            className="text-ink-2 ml-1.5 text-xs font-medium"
          >
            {required ? 'required' : requiredNote}
          </span>
        )}
      </label>
      <FieldContext value={{ id, describedBy, invalid: !!error, required }}>
        {children}
      </FieldContext>
      {error && errorId && <ErrorText id={errorId}>{error}</ErrorText>}
      {hint && (
        <p id={hintId} className="text-ink-2 m-0 text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

type FieldError = { id: string; label: string; message: string };

type ErrorSummaryProps = {
  errors: FieldError[];
  /** Submit count (e.g. RHF submitCount): each new failed attempt refocuses the summary. */
  attempt?: number;
};

export function ErrorSummary({ errors, attempt }: ErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<{ has: boolean; attempt?: number }>({ has: false });

  useEffect(() => {
    const has = errors.length > 0;
    if (has && (!last.current.has || attempt !== last.current.attempt))
      ref.current?.focus();
    last.current = { has, attempt };
  }, [errors, attempt]);

  if (errors.length === 0) return null;

  // Focus the field and keep its label in view (a plain fragment jump hides it under the top edge).
  const jump = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'center' });
  };

  const count = errors.length;
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-ctl bg-overdue-bg text-13 text-overdue flex items-start gap-2.5 px-3 py-2.5"
    >
      <CircleAlert aria-hidden className="mt-px size-4 shrink-0" />
      <div>
        <p className="m-0 font-semibold">
          {count === 1
            ? '1 field needs attention.'
            : `${count} fields need attention.`}
        </p>
        <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0">
          {errors.map((error) => (
            <li key={error.id}>
              <a
                href={`#${error.id}`}
                onClick={(event) => jump(event, error.id)}
                className="text-overdue inline-flex min-h-6 items-center underline underline-offset-2"
              >
                {error.label}: {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
