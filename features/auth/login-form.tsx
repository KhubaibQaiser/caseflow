'use client';

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useRouter } from 'next/navigation';
import CircleAlert from 'lucide-react/icons/circle-alert';
import Eye from 'lucide-react/icons/eye';
import EyeOff from 'lucide-react/icons/eye-off';
import Info from 'lucide-react/icons/info';

import { BrandMark } from '@/components/shell/brand-mark';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeading } from '@/components/ui/page-heading';
import { clearReturn, hasReturn } from '@/lib/auth/return-marker';
import { SignInSchema } from '@/lib/contracts/auth';
import { zodFieldErrors, type Result } from '@/lib/contracts/result';

import { safeNext } from './safe-next';

type LoginFormProps = {
  action: (prev: Result<null> | null, data: FormData) => Promise<Result<null>>;
  reason?: 'expired';
  next?: string;
};

const subscribe = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const BACK_TIMEOUT_MS = 1000;

function Banner({
  tone,
  children,
}: {
  tone: 'error' | 'info';
  children: string;
}) {
  const Icon = tone === 'error' ? CircleAlert : Info;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-ctl text-13 flex items-start gap-2 px-3 py-2.5 ${
        tone === 'error'
          ? 'bg-overdue-bg text-overdue'
          : 'bg-accent-soft text-accent'
      }`}
    >
      <Icon aria-hidden className="mt-px size-4 shrink-0" />
      <p className="m-0">{children}</p>
    </div>
  );
}

export function LoginForm({ action, reason, next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  // The failed result whose lock has run out; compared by identity so a new result re-locks.
  const [unlocked, setUnlocked] = useState<unknown>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  // '' on the server and during hydration, the browser zone after.
  const tz = useSyncExternalStore(subscribe, browserTimeZone, () => '');

  // Adjust state while rendering (not in an effect): a lock empties the password.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state && !state.ok && state.error.code === 'rate_limited')
      setPassword('');
  }

  const error = state && !state.ok ? state.error : null;
  const locked =
    error?.code === 'rate_limited' && state !== unlocked && !!error.retryAfter;
  const fieldErrors = {
    ...(error?.code === 'validation' ? error.fieldErrors : undefined),
    ...clientErrors,
  };
  const banner =
    error && error.code !== 'validation' && state !== unlocked ? error : null;

  const retryAfter = error?.retryAfter;
  useEffect(() => {
    if (!retryAfter) return;
    const t = setTimeout(() => setUnlocked(state), retryAfter * 1000);
    return () => clearTimeout(t);
  }, [state, retryAfter]);

  useEffect(() => emailRef.current?.focus(), []);

  // Back only when the form that expired marked its draft entry. The marker is read once
  // and cleared on every load, so an abandoned one can't send a later sign-in Back.
  const goBack = useRef(false);
  useEffect(() => {
    goBack.current ||= reason === 'expired' && hasReturn(next);
    clearReturn();
  }, [reason, next]);
  const router = useRouter();
  const signedIn = state?.ok === true;
  useEffect(() => {
    if (!signedIn) return;
    const target = safeNext(next) ?? '/contacts';
    if (!goBack.current) return router.replace(target);
    window.history.back();
    // Back found nothing to return to (new tab, duplicated tab): go to next instead.
    const t = setTimeout(() => {
      if (window.location.pathname === '/login') router.replace(target);
    }, BACK_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [signedIn, next, router]);

  // Put focus where the next action is: the password after a wrong one, the email after a lock.
  useEffect(() => {
    if (!error || error.code === 'validation') return;
    (error.code === 'rate_limited' ? emailRef : passwordRef).current?.focus();
  }, [error]);

  const clearError = (field: string) =>
    setClientErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

  function submit(formData: FormData) {
    // Read the submitted values: autofill may not fire onChange, so state can lag.
    const values = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };
    setEmail(values.email);
    setPassword(values.password);
    const parsed = SignInSchema.safeParse(values);
    if (!parsed.success) {
      const errors = zodFieldErrors(parsed.error);
      setClientErrors(errors);
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }
    setClientErrors({});
    if (goBack.current) formData.set('back', '1');
    formAction(formData);
  }

  return (
    <div className="bg-surface border-line rounded-surface shadow-raised flex w-full max-w-[380px] flex-col gap-4 border p-[22px] sm:p-7">
      <BrandMark />
      <div className="-mt-0.5">
        <PageHeading
          focusOnMount={false}
          className="text-ink m-0 text-xl font-semibold tracking-tight"
        >
          Sign in
        </PageHeading>
        <p className="text-ink-2 text-13 m-0 mt-1">
          Client intake for the firm.
        </p>
      </div>
      {reason === 'expired' && !banner && !pending && (
        <Banner tone="info">
          Your session ended. Sign in to pick up where you left off.
        </Banner>
      )}
      {banner && !pending && <Banner tone="error">{banner.message}</Banner>}
      <form action={submit} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="tz" value={tz} />
        {next && <input type="hidden" name="next" value={next} />}
        <Field id="email" label="Email" error={fieldErrors.email}>
          <Input
            ref={emailRef}
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="name@firm.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError('email');
            }}
          />
        </Field>
        <Field id="password" label="Password" error={fieldErrors.password}>
          <div className="relative">
            <Input
              ref={passwordRef}
              name="password"
              type={reveal ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-10"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError('password');
              }}
            />
            <button
              type="button"
              aria-label="Show password"
              aria-pressed={reveal}
              onClick={() => setReveal((v) => !v)}
              className="text-ink-2 hover:text-ink rounded-ctl absolute top-1/2 right-1 grid size-7 -translate-y-1/2 cursor-pointer place-items-center"
            >
              {reveal ? (
                <EyeOff aria-hidden className="size-4" />
              ) : (
                <Eye aria-hidden className="size-4" />
              )}
            </button>
          </div>
        </Field>
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          pending={pending}
          pendingLabel="Signing in…"
          disabled={locked}
        >
          Sign in
        </Button>
      </form>
      <p className="text-ink-2 border-line-soft m-0 flex items-start gap-1.5 border-t pt-3.5 text-xs">
        <Info aria-hidden className="mt-px size-3.5 shrink-0" />
        Access is by invitation. Ask your administrator for an account.
      </p>
    </div>
  );
}
