'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import ChevronDown from 'lucide-react/icons/chevron-down';
import Columns3 from 'lucide-react/icons/columns-3';
import Ellipsis from 'lucide-react/icons/ellipsis';
import ListFilter from 'lucide-react/icons/list-filter';
import Plus from 'lucide-react/icons/plus';
import Search from 'lucide-react/icons/search';
import Users from 'lucide-react/icons/users';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import { Chip } from '@/components/ui/chip';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ErrorText } from '@/components/ui/error-text';
import { ErrorSummary, Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusPill, UrgencyPill } from '@/components/ui/pill';
import { RadioGroup } from '@/components/ui/radio-group';
import { Segmented } from '@/components/ui/segmented';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { Tooltip } from '@/components/ui/tooltip';
import { STATUSES, STATUS_LABEL, type Status } from '@/lib/contracts/enums';
import { toDateOnly } from '@/lib/dates/date-only';
import { formatDateShort } from '@/lib/dates/labels';

const VIEWER_REASON = "Viewers can't edit contacts. Ask an admin.";

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
  { value: 'none', label: 'No follow-up set', disabled: true },
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

function FiltersButton({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <Button
      variant="ghost"
      aria-expanded={open}
      onClick={() => setOpen((o) => !o)}
    >
      <ListFilter aria-hidden className="size-4" />
      Filters
      <span className="tnum bg-accent text-on-accent rounded-pill min-w-[18px] px-1.5 text-center text-xs leading-[18px] forced-colors:forced-color-adjust-auto">
        2
      </span>
      <span className="sr-only"> active</span>
    </Button>
  );
}

function FormDemo() {
  const [attempt, setAttempt] = useState(0);
  const [errors, setErrors] = useState<
    { id: string; label: string; message: string }[]
  >([]);
  const errorFor = (id: string) => errors.find((e) => e.id === id)?.message;
  const contactError = errorFor('demo-email');
  // One error covers the Email | Phone pair: both inputs point at it.
  const contactProps = contactError
    ? { 'aria-invalid': true, 'aria-describedby': 'demo-contact-error' }
    : {};

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const filled = (key: string) => String(data.get(key) ?? '').trim() !== '';
    const next = [];
    if (!filled('name'))
      next.push({
        id: 'demo-name',
        label: 'Full name',
        message: 'Enter a full name.',
      });
    if (!filled('email') && !filled('phone'))
      next.push({
        id: 'demo-email',
        label: 'Email or phone',
        message: 'Add an email or a phone number.',
      });
    setErrors(next);
    setAttempt((n) => n + 1);
  };

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex max-w-[720px] flex-col gap-3"
    >
      <ErrorSummary errors={errors} attempt={attempt} />
      <Field
        id="demo-name"
        label="Full name"
        required
        error={errorFor('demo-name')}
      >
        <Input name="name" placeholder="e.g. Marisol Ortega" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="demo-email" label="Email">
          <Input
            name="email"
            type="email"
            placeholder="name@example.com"
            {...contactProps}
          />
        </Field>
        <Field id="demo-phone" label="Phone">
          <Input
            name="phone"
            type="tel"
            placeholder="(512) 555-0100"
            {...contactProps}
          />
        </Field>
        {contactError && (
          <div className="sm:col-span-2">
            <ErrorText id="demo-contact-error">{contactError}</ErrorText>
          </div>
        )}
      </div>
      <Field id="demo-summary-form" label="Matter summary">
        <Textarea
          name="summary"
          maxLength={1000}
          counterFrom={0}
          placeholder="What happened, key dates, what they want from the firm."
        />
      </Field>
      <Segmented
        id="demo-form-status"
        label="Status"
        name="status"
        options={STATUS_OPTIONS}
        defaultValue="lead"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="reset" onClick={() => setErrors([])}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Save contact
        </Button>
      </div>
    </form>
  );
}

function MoveMenu() {
  const [status, setStatus] = useState<Status>('lead');
  const move = (next: Status) => {
    const previous = status;
    setStatus(next);
    toast.success(`Marisol Ortega moved to ${STATUS_LABEL[next]}`, {
      action: { label: 'Undo', onClick: () => setStatus(previous) },
    });
  };
  return (
    <div className="flex items-center gap-2">
      <StatusPill status={status} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            Move to…
            <ChevronDown aria-hidden className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Move Marisol to</DropdownMenuLabel>
          {STATUSES.filter((s) => s !== status).map((s) => (
            <DropdownMenuItem key={s} onSelect={() => move(s)}>
              <StatusPill status={s} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DateDemo() {
  const today = toDateOnly(new Date());
  const [empty, setEmpty] = useState<string | null>(null);
  const [set, setSet] = useState<string | null>('2026-11-20');
  return (
    <div className="grid max-w-[720px] gap-3 sm:grid-cols-3">
      <Field id="demo-date-empty" label="Next follow-up" hint="Today or later.">
        <DatePicker
          value={empty}
          onChange={setEmpty}
          min={today}
          label="Next follow-up"
        />
      </Field>
      <Field id="demo-date-set" label="Next follow-up" hint="Today or later.">
        <DatePicker
          value={set}
          onChange={setSet}
          min={today}
          label="Next follow-up"
        />
      </Field>
      <Field
        id="demo-date-invalid"
        label="Next follow-up"
        error="Pick today or a later date."
      >
        <DatePicker
          value="2026-10-05"
          onChange={() => {}}
          min={today}
          label="Next follow-up"
        />
      </Field>
    </div>
  );
}

function RescheduleDemo() {
  const today = toDateOnly(new Date());
  const [date, setDate] = useState<string | null>('2026-11-20');
  return (
    <>
      <span className="text-13 tnum text-ink">
        {date ? formatDateShort(date, today) : 'Not set'}
      </span>
      <DatePicker
        value={date}
        onChange={(next) => {
          setDate(next);
          toast.success(
            next
              ? `Follow-up set to ${formatDateShort(next, today)}`
              : 'Follow-up cleared',
          );
        }}
        min={today}
        label="Reschedule follow-up"
        trigger={
          <Button variant="ghost" size="sm">
            Reschedule
          </Button>
        }
      />
      <DatePicker
        value={date}
        onChange={() => {}}
        label="Reschedule follow-up"
        trigger={
          <Button variant="ghost" size="sm" disabledReason={VIEWER_REASON}>
            Reschedule
          </Button>
        }
      />
      <span className="text-ink-2 text-xs">Admin, then Viewer.</span>
    </>
  );
}

function SheetDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">Filters</Button>
      </DialogTrigger>
      <Sheet
        side="right"
        title="Filters"
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost" className="h-10 flex-1">
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="primary" className="h-10 flex-[1.4]">
                Apply
              </Button>
            </DialogClose>
          </>
        }
      >
        <CheckboxGroup id="demo-sheet-status" legend="Status">
          <Checkbox label="Lead" count={642} />
          <Checkbox label="Active" count={642} />
          <Checkbox label="Closed" count={1153} />
        </CheckboxGroup>
      </Sheet>
    </Dialog>
  );
}

function DiscardDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">Cancel edit</Button>
      </DialogTrigger>
      <DialogContent
        title="Discard changes?"
        description="Your edits to Marisol Ortega haven't been saved."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Keep editing</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="primary">Discard</Button>
            </DialogClose>
          </>
        }
      />
    </Dialog>
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

      <Section
        title="Button"
        note="Primary, ghost and link, in md, sm and icon."
      >
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
        <Row label="With icon">
          <Button variant="primary">
            <Plus aria-hidden className="size-4" />
            New contact
          </Button>
          <Button variant="ghost">
            Move to…
            <ChevronDown aria-hidden className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="More actions">
            <Ellipsis aria-hidden className="size-4" />
          </Button>
        </Row>
        <Row label="Open">
          <FiltersButton initialOpen={false} />
          <FiltersButton initialOpen />
          <span className="text-ink-2 text-xs">
            aria-expanded; click to toggle.
          </span>
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
          <Button variant="ghost" disabledReason={VIEWER_REASON}>
            Edit
          </Button>
          <span className="text-ink-2 text-xs">
            Edit stays focusable. Hover, focus or tap it for the reason.
          </span>
        </Row>
      </Section>

      <Section
        title="Field, input and textarea"
        note="Submit empty to see inline errors and the summary take focus."
      >
        <FormDemo />
        <div className="grid max-w-[720px] gap-3 sm:grid-cols-2">
          <Field id="demo-phone-hint" label="Phone" hint="Any format works.">
            <Input type="tel" defaultValue="(512) 555-0100" />
          </Field>
          <Field id="demo-locked" label="Workspace">
            <Input disabled defaultValue="Intake team" />
          </Field>
          <Field
            id="demo-summary"
            label="Matter summary"
            hint="Counter appears past 800 characters."
          >
            <Textarea maxLength={1000} defaultValue={LONG_SUMMARY} rows={5} />
          </Field>
          <Field
            id="demo-summary-invalid"
            label="Note"
            required
            error="Write a note before saving."
          >
            <Textarea maxLength={2000} />
          </Field>
        </div>
      </Section>

      <Section
        title="Checkbox, radio group and segmented"
        note="Second row: invalid. The error marks the group and every unchecked option."
      >
        <div className="grid gap-6 sm:grid-cols-3">
          <CheckboxGroup id="demo-matter" legend="Matter type">
            <Checkbox label="Personal injury" count={412} defaultChecked />
            <Checkbox label="Family" count={398} defaultChecked />
            <Checkbox label="Immigration" count={387} />
            <Checkbox label="Criminal defense" count={0} disabled />
          </CheckboxGroup>
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
                {
                  value: 'closed',
                  label: 'Closed',
                  count: 1153,
                  disabled: true,
                },
              ]}
              defaultValue="active"
            />
            <p className="text-ink-2 m-0 text-xs">
              Arrow keys move the selection and skip disabled options.
            </p>
          </div>
        </div>
        <div className="border-line-soft grid gap-6 border-t pt-3 sm:grid-cols-3">
          <CheckboxGroup
            id="demo-matter-invalid"
            legend="Matter type"
            error="Pick at least one matter type."
          >
            <Checkbox label="Personal injury" />
            <Checkbox label="Family" />
            <Checkbox label="Immigration" />
          </CheckboxGroup>
          <RadioGroup
            id="demo-follow-up-invalid"
            legend="Follow-up"
            name="demo-follow-up-invalid"
            options={FOLLOW_UP_WINDOWS.slice(1, 4)}
            error="Choose a follow-up window."
          />
          <Segmented
            id="demo-status-invalid"
            label="Status"
            name="demo-status-invalid"
            options={STATUS_OPTIONS}
            error="Choose a status."
          />
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

      <Section
        title="Menu, tooltip and dialogs"
        note="Arrow keys move through the menu; Esc closes any overlay and returns focus to its trigger."
      >
        <Row label="Menu">
          <MoveMenu />
        </Row>
        <Row label="Viewer">
          <Button variant="ghost" size="sm" disabledReason={VIEWER_REASON}>
            Move to…
            <ChevronDown aria-hidden className="size-3.5" />
          </Button>
        </Row>
        <Row label="Tooltip">
          <Tooltip content="Pipeline">
            <a
              href="#pipeline"
              aria-label="Pipeline"
              className="rounded-ctl text-ink-2 hover:bg-track hover:text-ink grid size-9 place-items-center transition-colors duration-150"
            >
              <Columns3 aria-hidden className="size-4" />
            </a>
          </Tooltip>
          <span className="text-ink-2 text-xs">Icon rail label on tablet.</span>
        </Row>
        <Row label="Dialog">
          <DiscardDialog />
        </Row>
        <Row label="Sheet">
          <SheetDemo />
          <span className="text-ink-2 text-xs">
            Mobile filters. Esc, the scrim or ✕ closes it.
          </span>
        </Row>
      </Section>

      <Section
        title="Date picker"
        note="Empty, set and invalid. Days before today are disabled; Clear removes the date."
      >
        <DateDemo />
        <Row label="Button trigger">
          <RescheduleDemo />
        </Row>
      </Section>

      <Section
        title="Toast"
        note="Bottom centre, 6s, paused on hover or focus. An error with Retry stays until acted on or dismissed. Alt+T jumps to it."
      >
        <Row label="Success">
          <Button
            variant="ghost"
            onClick={() => toast.success('Contact saved')}
          >
            Contact saved
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              toast.success('Marisol Ortega moved to Active', {
                action: {
                  label: 'Undo',
                  onClick: () => toast('Marisol Ortega moved back to Lead'),
                },
              })
            }
          >
            Move with Undo
          </Button>
        </Row>
        <Row label="Error">
          <Button
            variant="ghost"
            onClick={() =>
              toast.error("Move didn't save. Marisol Ortega is back in Lead.", {
                action: { label: 'Retry', onClick: () => {} },
              })
            }
          >
            Move failed
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              toast.error("You don't have permission to move contacts.")
            }
          >
            Forbidden
          </Button>
        </Row>
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
            description="Add the first contact to start the pipeline."
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
