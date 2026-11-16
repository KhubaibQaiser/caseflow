'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import CircleAlert from 'lucide-react/icons/circle-alert';

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
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
};

export function Field({
  id,
  label,
  required = false,
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
        {required && (
          <span
            aria-hidden="true"
            className="text-ink-2 ml-1.5 text-xs font-medium"
          >
            Required
          </span>
        )}
      </label>
      <FieldContext value={{ id, describedBy, invalid: !!error, required }}>
        {children}
      </FieldContext>
      {error && (
        <p
          id={errorId}
          className="text-13 text-overdue m-0 flex items-start gap-1.5 font-medium"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-ink-2 m-0 text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}

type FieldError = { id: string; label: string; message: string };

export function ErrorSummary({ errors }: { errors: FieldError[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const hadErrors = useRef(false);

  useEffect(() => {
    const has = errors.length > 0;
    if (has && !hadErrors.current) ref.current?.focus();
    hadErrors.current = has;
  }, [errors]);

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
        <b className="font-semibold">
          {count === 1
            ? '1 field needs attention.'
            : `${count} fields need attention.`}
        </b>{' '}
        {errors.map((error, i) => (
          <span key={error.id}>
            {i > 0 && <span aria-hidden> · </span>}
            <a
              href={`#${error.id}`}
              onClick={(event) => jump(event, error.id)}
              className="text-overdue underline underline-offset-2"
            >
              {error.label}
            </a>
          </span>
        ))}
      </div>
    </div>
  );
}
