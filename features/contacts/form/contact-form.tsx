'use client';

import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import type { ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import '@/lib/contracts/zod-config';
import { z } from 'zod';
import type { Resolver, SubmitHandler } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { ErrorSummary, Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { ErrorText } from '@/components/ui/error-text';
import {
  makeContactInputSchema,
  type ContactDetail,
  type ContactInput,
} from '@/lib/contracts/contact';
import {
  MATTER_TYPE_LABEL,
  MATTER_TYPES,
  REFERRAL_SOURCE_LABEL,
  REFERRAL_SOURCES,
  STATUS_LABEL,
  STATUSES,
  type Status,
} from '@/lib/contracts/enums';
import { markReturn } from '@/lib/auth/return-marker';
import { fail, type Result } from '@/lib/contracts/result';

import { ConflictBanner, SaveFailedBanner } from './conflict-banner';
import { NativeSelect } from './native-select';
import { useUnsavedGuard } from './use-unsaved-guard';

const DiscardDialog = lazy(() => import('./discard-dialog'));

type Values = {
  fullName: string;
  email: string;
  phone: string;
  matterType: string;
  referralSource: string;
  status: Status;
  followUpOn: string | null;
  summary: string;
  /** Not an input: carries the email-or-phone rule's error. */
  contactMethod?: string;
};
type Name = keyof Values;

// Summary order is page order; `contactMethod` sits where the email/phone pair is.
const LABELS: Record<Name, string> = {
  fullName: 'Full name',
  contactMethod: 'Email or phone',
  email: 'Email',
  phone: 'Phone',
  matterType: 'Matter type',
  referralSource: 'Referral source',
  status: 'Status',
  followUpOn: 'Next follow-up',
  summary: 'Matter summary',
};
const ORDER = Object.keys(LABELS) as Name[];
const isName = (k: string): k is Name => k in LABELS;

type Banner =
  { kind: 'conflict' } | { kind: 'failed'; message?: string; retry: boolean };

type Props = {
  mode: 'create' | 'edit';
  initial?: ContactDetail;
  /** Today in the viewer's time zone, 'YYYY-MM-DD'. */
  today: string;
  /** `expectedUpdatedAt` is the contact's `updatedAt`, verbatim ('' when creating). */
  onSubmit(
    input: ContactInput,
    expectedUpdatedAt: string,
  ): Promise<Result<{ id: string }>>;
};

// What survives a session expiry in history.state: the typed values plus the stamp they were made against.
const DraftSchema = z.object({
  mode: z.enum(['create', 'edit']),
  id: z.string().nullable(),
  values: z.object({
    fullName: z.string(),
    email: z.string(),
    phone: z.string(),
    matterType: z.string(),
    referralSource: z.string(),
    status: z.enum(STATUSES),
    followUpOn: z.string().nullable(),
    summary: z.string(),
  }),
  stamp: z.string(),
});

const valuesOf = (c?: ContactDetail): Values => ({
  fullName: c?.fullName ?? '',
  email: c?.email ?? '',
  phone: c?.phone ?? '',
  matterType: c?.matterType ?? '',
  referralSource: c?.referralSource ?? '',
  status: c?.status ?? 'lead',
  followUpOn: c?.followUpOn ?? null,
  summary: c?.summary ?? '',
});

function Legend({ children }: { children: ReactNode }) {
  return (
    <legend className="text-13 text-ink px-1 font-semibold">{children}</legend>
  );
}

const fieldset =
  'rounded-surface border-line bg-surface m-0 flex min-w-0 flex-col gap-3 border px-4 pt-3 pb-4';

export function ContactForm({ mode, initial, today, onSubmit }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshing, startRefresh] = useTransition();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Where a discard goes; set while the Discard changes? dialog is open.
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  // The errors the last failed submit reported; the summary shows these while they stay unfixed.
  const [reported, setReported] = useState<Name[]>([]);
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  // Frozen at open: a conflict refresh hands us a newer `initial`, but Save must keep proving what the edits were based on.
  const initialId = initial?.id;
  const stamp = useRef(initial?.updatedAt ?? '');

  const resolver = zodResolver(
    makeContactInputSchema({ today, previousFollowUpOn: initial?.followUpOn }),
  ) as unknown as Resolver<Values, unknown, ContactInput>;
  const form = useForm<Values, unknown, ContactInput>({
    resolver,
    mode: 'onTouched',
    shouldFocusError: false, // the error summary takes focus
    defaultValues: valuesOf(initial),
  });
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    control,
    formState: { errors, isDirty },
  } = form;
  useUnsavedGuard(isDirty && !leaving, setLeaveTo);

  // Back from the sign-in page after a session expiry: put the typed values (and their stamp) back.
  useEffect(() => {
    const draft = DraftSchema.safeParse(window.history.state?.caseflowDraft);
    // A draft belongs to one form: another contact's, or create vs edit, is not ours.
    if (
      !draft.success ||
      draft.data.mode !== mode ||
      draft.data.id !== (initialId ?? null)
    )
      return;
    const rest = Object.fromEntries(
      Object.entries(window.history.state).filter(
        ([k]) => k !== 'caseflowDraft',
      ),
    );
    window.history.replaceState(rest, '');
    stamp.current = draft.data.stamp;
    reset(draft.data.values, { keepDefaultValues: true }); // differs from the defaults, so dirty
  }, [reset, mode, initialId]);

  const status = useWatch({ control, name: 'status' });
  const followUpOn = useWatch({ control, name: 'followUpOn' });
  const summary = useWatch({ control, name: 'summary' });
  const err = (n: Name) => errors[n]?.message;
  const contactMethodError = err('contactMethod');
  const backHref = initial ? `/contacts/${initial.id}` : '/contacts';

  const report = (names: Name[]) => {
    setReported(ORDER.filter((n) => names.includes(n)));
    setAttempt((a) => a + 1);
  };

  const save = async (data: ContactInput) => {
    setBanner(null);
    let result: Result<{ id: string }>;
    try {
      result = await onSubmit(data, stamp.current);
    } catch {
      result = fail('server', 'Network error.');
    }
    if (result.ok) {
      setLeaving(true);
      reset(form.getValues());
      toast.success('Contact saved');
      router.push(`/contacts/${result.data.id}`);
      return;
    }
    const { code, message, fieldErrors } = result.error;
    if (code === 'unauthorized') {
      // The typed values ride in this entry's history state; Back from sign-in restores them.
      window.history.replaceState(
        {
          ...window.history.state,
          caseflowDraft: {
            mode,
            id: initial?.id ?? null,
            values: form.getValues(),
            stamp: stamp.current,
          },
        },
        '',
      );
      markReturn(pathname); // tells /login that Back leads to this draft
      router.push(`/login?reason=expired&next=${encodeURIComponent(pathname)}`);
    } else if (code === 'conflict') {
      setBanner({ kind: 'conflict' });
      startRefresh(() => router.refresh()); // fetch the newer copy for Reload and Overwrite
    } else if (code === 'validation' && fieldErrors) {
      const names: Name[] = [];
      for (const [key, text] of Object.entries(fieldErrors)) {
        if (isName(key)) {
          setError(key, { type: 'server', message: text });
          names.push(key);
        }
      }
      if (names.length) report(names);
      // Errors that name no field (or only unknown ones) would vanish silently otherwise.
      if (!names.length || names.length < Object.keys(fieldErrors).length)
        setBanner({ kind: 'failed', message, retry: false });
    } else if (code === 'forbidden' || code === 'not_found') {
      setBanner({ kind: 'failed', message, retry: false });
    } else {
      setBanner({ kind: 'failed', retry: true });
    }
  };

  const run = () => {
    if (busy.current) return Promise.resolve();
    busy.current = true; // synchronous: a second click lands before React re-renders
    const valid: SubmitHandler<ContactInput> = async (data) => {
      setSaving(true);
      await save(data);
    };
    return handleSubmit(valid, (invalid) =>
      report(Object.keys(invalid).filter(isName)),
    )().finally(() => {
      busy.current = false;
      setSaving(false);
    });
  };

  const summaryErrors = reported.flatMap((n) => {
    const message = err(n);
    return message ? [{ id: n, label: LABELS[n], message }] : [];
  });

  const cancel = () => (isDirty ? setLeaveTo(backHref) : router.push(backHref));
  const discard = () => {
    setLeaving(true);
    router.push(leaveTo ?? backHref);
  };

  const reloadLatest = () => {
    reset(valuesOf(initial));
    stamp.current = initial?.updatedAt ?? '';
    setBanner(null);
    setReported([]);
  };

  const pending = saving || leaving;
  return (
    <>
      <form
        noValidate
        aria-label={mode === 'create' ? 'New contact' : 'Edit contact'}
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}
        className="flex max-w-[720px] flex-col gap-3.5"
      >
        <ErrorSummary errors={summaryErrors} attempt={attempt} />
        {banner?.kind === 'conflict' && (
          <ConflictBanner busy={refreshing || saving} onReload={reloadLatest} />
        )}
        {banner?.kind === 'failed' && (
          <SaveFailedBanner
            message={banner.message}
            onRetry={banner.retry ? () => void run() : undefined}
          />
        )}

        <fieldset className={fieldset}>
          <Legend>Person</Legend>
          <Field
            id="fullName"
            label="Full name"
            required
            error={err('fullName')}
          >
            <Input
              {...register('fullName')}
              autoComplete="off"
              placeholder="e.g. Marisol Ortega"
            />
          </Field>
          <div
            id="contactMethod"
            role="group"
            aria-label="Email or phone"
            tabIndex={contactMethodError ? -1 : undefined}
            aria-describedby={
              contactMethodError ? 'contactMethod-error' : undefined
            }
            className="grid gap-3 outline-none sm:grid-cols-2"
          >
            <Field id="email" label="Email" error={err('email')}>
              <Input
                {...register('email')}
                type="email"
                autoComplete="off"
                placeholder="name@example.com"
                aria-invalid={
                  !!(err('email') || contactMethodError) || undefined
                }
                aria-describedby={
                  contactMethodError ? 'contactMethod-error' : undefined
                }
              />
            </Field>
            <Field id="phone" label="Phone" error={err('phone')}>
              <Input
                {...register('phone')}
                type="tel"
                autoComplete="off"
                placeholder="(512) 555-0100"
                aria-invalid={
                  !!(err('phone') || contactMethodError) || undefined
                }
                aria-describedby={
                  contactMethodError ? 'contactMethod-error' : undefined
                }
              />
            </Field>
            {contactMethodError && (
              <div className="sm:col-span-2">
                <ErrorText id="contactMethod-error">
                  {contactMethodError}
                </ErrorText>
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className={fieldset}>
          <Legend>Matter</Legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="matterType"
              label="Matter type"
              required
              error={err('matterType')}
            >
              <NativeSelect {...register('matterType')}>
                <option value="">Choose a matter type</option>
                {MATTER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MATTER_TYPE_LABEL[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              id="referralSource"
              label="Referral source"
              error={err('referralSource')}
            >
              <NativeSelect {...register('referralSource')}>
                <option value="">Not set</option>
                {REFERRAL_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {REFERRAL_SOURCE_LABEL[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field id="summary" label="Matter summary" error={err('summary')}>
            <Textarea
              {...register('summary')}
              value={summary}
              maxLength={1000}
              counterFrom={0}
              placeholder="What happened, key dates, what they want from the firm."
            />
          </Field>
        </fieldset>

        <fieldset className={fieldset}>
          <Legend>Intake</Legend>
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <Segmented
              name="status"
              label="Status"
              error={err('status')}
              options={STATUSES.map((s) => ({
                value: s,
                label: STATUS_LABEL[s],
              }))}
              value={status}
              onValueChange={(v) => {
                const next = STATUSES.find((s) => s === v);
                if (next) setValue('status', next, { shouldDirty: true });
              }}
            />
            <Field
              id="followUpOn"
              label="Next follow-up"
              error={err('followUpOn')}
              hint={
                initial?.followUpOn && initial.followUpOn < today
                  ? 'Today or later, or keep the current date.'
                  : 'Today or later.'
              }
            >
              <DatePicker
                label="Next follow-up"
                min={today}
                value={followUpOn}
                onChange={(v) =>
                  setValue('followUpOn', v, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
              />
            </Field>
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={cancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            pending={pending}
            pendingLabel="Saving…"
          >
            Save contact
          </Button>
        </div>
      </form>
      {leaveTo !== null && (
        <Suspense fallback={null}>
          <DiscardDialog onDiscard={discard} onClose={() => setLeaveTo(null)} />
        </Suspense>
      )}
    </>
  );
}
