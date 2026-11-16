'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Search from 'lucide-react/icons/search';
import Users from 'lucide-react/icons/users';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ErrorSummary, Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusPill, UrgencyPill } from '@/components/ui/pill';
import { RadioGroup } from '@/components/ui/radio-group';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { STATUSES, STATUS_LABEL } from '@/lib/contracts/enums';

const LONG_SUMMARY =
  'Rear-ended at a stop light on I-35 near the Riverside exit on October 2. ' +
  'Went to urgent care the same evening for neck and lower back pain, then two ' +
  'follow-up visits with a physical therapist. The other driver was cited at the ' +
  'scene. Their insurer has called twice asking for a recorded statement; she has ' +
  'not given one. Missed nine shifts at work so far and has pay stubs for all of ' +
  'them. Wants to know whether the firm will take the case on contingency and what ' +
  'to say if the insurer calls again. Prefers calls after 5pm. Spanish is fine. ' +
  'Her sister referred her after a past matter with the firm in 2023. ' +
  "Has photos of both cars, the police report number and the other driver's " +
  'insurance card. No prior injuries to the neck or back. Asked whether the ' +
  'urgent care bill should go through her own health plan for now.';

const FOLLOW_UP_WINDOWS = [
  { value: 'any', label: 'Any' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'dueToday', label: 'Due today' },
  { value: 'next7Days', label: 'Due this week' },
  { value: 'none', label: 'No follow-up set' },
];

const STATUS_OPTIONS = STATUSES.map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-surface border-line bg-surface flex flex-col gap-3 border px-4 py-3.5">
      <header>
        <h2 className="text-13 text-ink m-0 font-semibold">{title}</h2>
        {note && <p className="text-ink-2 m-0 mt-0.5 text-xs">{note}</p>}
      </header>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[120px_1fr] sm:items-center">
      <span className="text-ink-2 text-xs font-semibold">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function PendingDemo() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="primary"
      pending={pending}
      pendingLabel="Saving…"
      onClick={() => {
        setPending(true);
        setTimeout(() => setPending(false), 1500);
      }}
    >
      Save contact
    </Button>
  );
}

function FormDemo() {
  const [errors, setErrors] = useState<
    { id: string; label: string; message: string }[]
  >([]);
  const errorFor = (id: string) => errors.find((e) => e.id === id)?.message;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = [];
    if (!String(data.get('name')).trim())
      next.push({
        id: 'demo-name',
        label: 'Full name',
        message: 'Enter a full name.',
      });
    if (!String(data.get('email')).trim())
      next.push({
        id: 'demo-email',
        label: 'Email',
        message: 'Add an email or a phone number.',
      });
    setErrors(next);
  };

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex max-w-[720px] flex-col gap-3"
    >
      <ErrorSummary errors={errors} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="demo-name"
          label="Full name"
          required
          error={errorFor('demo-name')}
        >
          <Input name="name" placeholder="e.g. Marisol Ortega" />
        </Field>
        <Field id="demo-email" label="Email" error={errorFor('demo-email')}>
          <Input name="email" type="email" placeholder="name@example.com" />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" type="submit">
          Save contact
        </Button>
        <Button variant="ghost" type="reset" onClick={() => setErrors([])}>
          Reset
        </Button>
      </div>
    </form>
  );
}

export function Gallery() {
  const [chips, setChips] = useState([
    { label: 'Status', value: 'Lead, Active' },
    { label: 'Matter type', value: 'Family' },
    { label: 'Follow-up', value: 'Overdue' },
  ]);
  const [status, setStatus] = useState('lead');

  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-4 px-4 py-6 sm:px-6">
      <header>
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.01em]">
          Components
        </h1>
        <p className="text-13 text-ink-2 m-0 mt-1">
          Every primitive in every state. Hover, press and Tab through each row
          for the interactive states. Not reachable in production.
        </p>
      </header>

      <Section title="Button" note="Primary, ghost and link, in md and sm.">
        <Row label="Default">
          <Button variant="primary">New contact</Button>
          <Button variant="ghost">Filters</Button>
          <Button variant="link">Clear all</Button>
        </Row>
        <Row label="Small">
          <Button variant="primary" size="sm">
            Add note
          </Button>
          <Button variant="ghost" size="sm">
            Move to…
          </Button>
        </Row>
        <Row label="Pending">
          <Button variant="primary" pending pendingLabel="Signing in…">
            Sign in
          </Button>
          <Button variant="ghost" pending>
            Apply
          </Button>
          <PendingDemo />
        </Row>
        <Row label="Disabled">
          <Button variant="primary" disabled>
            Save contact
          </Button>
          <Button
            variant="ghost"
            disabledReason="Your role is Viewer, which is read-only."
          >
            Edit
          </Button>
          <span className="text-ink-2 text-xs">
            Edit stays focusable and explains why.
          </span>
        </Row>
      </Section>

      <Section
        title="Field, input and textarea"
        note="Submit empty to see inline errors and the summary take focus."
      >
        <FormDemo />
        <div className="grid max-w-[720px] gap-3 sm:grid-cols-2">
          <Field id="demo-phone" label="Phone" hint="Digits only is fine.">
            <Input type="tel" defaultValue="(512) 555-0100" />
          </Field>
          <Field id="demo-locked" label="Workspace">
            <Input disabled defaultValue="Intake team" />
          </Field>
          <Field id="demo-summary-empty" label="Matter summary">
            <Textarea
              maxLength={1000}
              placeholder="What happened, key dates, what they want from the firm."
            />
          </Field>
          <Field
            id="demo-summary"
            label="Matter summary"
            hint="Counter appears past 800 characters."
          >
            <Textarea maxLength={1000} defaultValue={LONG_SUMMARY} rows={5} />
          </Field>
        </div>
      </Section>

      <Section title="Checkbox, radio group and segmented">
        <div className="grid gap-6 sm:grid-cols-3">
          <fieldset className="m-0 border-0 p-0">
            <legend className="text-ink-2 mb-1 p-0 text-xs font-semibold">
              Matter type
            </legend>
            <Checkbox label="Personal injury" count={412} defaultChecked />
            <Checkbox label="Family" count={398} defaultChecked />
            <Checkbox label="Immigration" count={387} />
            <Checkbox label="Criminal defense" count={0} disabled />
          </fieldset>
          <RadioGroup
            legend="Follow-up"
            name="demo-follow-up"
            options={FOLLOW_UP_WINDOWS}
            defaultValue="any"
          />
          <div className="flex flex-col gap-4">
            <Segmented
              label="Status"
              name="demo-status"
              options={STATUS_OPTIONS}
              value={status}
              onValueChange={setStatus}
            />
            <Segmented
              label="Pipeline column"
              name="demo-column"
              options={[
                { value: 'lead', label: 'Lead', count: 642 },
                { value: 'active', label: 'Active', count: 642 },
                { value: 'closed', label: 'Closed', count: 1153 },
              ]}
              defaultValue="active"
            />
            <p className="text-ink-2 m-0 text-xs">
              Arrow keys move the selection.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Pills"
        note="Status is neutral. Warm colours mean urgency only, and both are always written as text."
      >
        <Row label="Status">
          <StatusPill status="lead" />
          <StatusPill status="active" />
          <StatusPill status="closed" />
        </Row>
        <Row label="Follow-up">
          <UrgencyPill tone="overdue" text="Overdue · 3d" />
          <UrgencyPill tone="today" text="Today" />
          <UrgencyPill tone="later" text="Thu, Nov 19" />
          <UrgencyPill tone="none" text="Not set" />
          <UrgencyPill tone="muted" text="Mon, Oct 5" />
        </Row>
      </Section>

      <Section title="Chip" note="Active filters. Remove one to see it go.">
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Chip
              key={chip.label}
              label={chip.label}
              value={chip.value}
              onRemove={() =>
                setChips((all) => all.filter((c) => c.label !== chip.label))
              }
            />
          ))}
          {chips.length === 0 && (
            <span className="text-13 text-ink-2">No filters.</span>
          )}
        </div>
      </Section>

      <Section title="Loading, empty and error">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div aria-busy className="flex flex-col">
            {[
              ['w-2/5', 'w-[70%]'],
              ['w-[55%]', 'w-3/5'],
              ['w-[35%]', 'w-3/4'],
              ['w-1/2', 'w-[65%]'],
            ].map(([a, b]) => (
              <div
                key={a}
                className="border-line-soft flex flex-col gap-1.5 border-b py-2"
              >
                <Skeleton className={a} />
                <Skeleton className={b} />
              </div>
            ))}
          </div>
          <EmptyState
            icon={Users}
            title="No contacts yet."
            description="Add the first enquiry to start the pipeline."
            action={<Button variant="primary">New contact</Button>}
          />
          <EmptyState
            icon={Search}
            title="No contacts match these filters."
            description="Status: Closed · Follow-up: Overdue"
            action={<Button variant="ghost">Clear filters</Button>}
          />
          <ErrorState
            title="Contacts didn't load."
            description="The server didn't respond. Your filters are kept."
            onRetry={() => {}}
          />
        </div>
      </Section>
    </main>
  );
}
