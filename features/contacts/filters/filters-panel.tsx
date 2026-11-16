'use client';

import ChevronDown from 'lucide-react/icons/chevron-down';
import X from 'lucide-react/icons/x';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { optionMark, optionRow } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import {
  FOLLOW_UP_LABEL,
  MATTER_TYPES,
  MATTER_TYPE_LABEL,
  REFERRAL_SOURCES,
  REFERRAL_SOURCE_LABEL,
  STATUSES,
  STATUS_LABEL,
} from '@/lib/contracts/enums';
import type { ContactFacets } from '@/lib/contracts/facets';

import { useListQuery } from '../url-state';
import { pickDraft, useFilterDraft } from './use-filter-draft';
import type { FilterDraft } from './use-filter-draft';
import { useIsDesktop } from './use-filters-panel';

type FiltersPanelProps = {
  open: boolean;
  /** Called with false by Apply, Cancel, the close button and Esc. The owner returns focus to the Filters button. */
  onOpenChange(open: boolean): void;
  facets: ContactFacets;
  /** The pipeline fixes status per column. */
  hideStatus?: boolean;
  /** The Filters button: the sheet hands focus back to it (it is not a Dialog trigger). */
  returnFocusTo?: RefObject<HTMLElement | null>;
  /** Move focus into the side panel when it opens. */
  focusOnOpen?: boolean;
};

const MESSAGES = {
  empty: 'Pick a follow-up date.',
  reversed: 'End is before start.',
} as const;

/** Desktop: a non-modal side panel under the toolbar. Narrow: a modal sheet. Both edit a draft until Apply. */
export function FiltersPanel(props: FiltersPanelProps) {
  const desktop = useIsDesktop();
  const [query, setQuery] = useListQuery();
  const applied = pickDraft(query);
  const draft = useFilterDraft(applied);
  const { open, onOpenChange } = props;

  // A fresh draft each time the panel opens, and whenever the URL changes under it (chip removed, back button).
  const stamp = `${open}|${JSON.stringify(applied)}`;
  const [seen, setSeen] = useState(stamp);
  if (seen !== stamp) {
    setSeen(stamp);
    draft.reset();
  }

  // Apply closes the panel, so a second click of a double-click must not write again.
  const sent = useRef(false);
  useEffect(() => {
    if (open) sent.current = false;
  }, [open]);

  const apply = () => {
    if (sent.current || !draft.valid) return;
    sent.current = true;
    if (draft.dirty) setQuery(draft.apply());
    onOpenChange(false);
  };
  const cancel = () => onOpenChange(false);

  const blocked = !draft.valid
    ? MESSAGES[draft.errors.fu ?? 'reversed']
    : undefined;
  const footer = (
    <>
      <Button variant="ghost" onClick={cancel} className="flex-1 max-lg:h-10">
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={apply}
        disabledReason={blocked}
        className="flex-[1.4] max-lg:h-10"
      >
        Apply
      </Button>
    </>
  );
  const clearAll = (
    <Button variant="link" onClick={draft.clearAll} className="text-13">
      Clear all
    </Button>
  );
  const title = (
    <>
      Filters <span className="text-ink-2 font-medium">· {draft.groups}</span>
    </>
  );
  const body = (
    <Groups draft={draft} facets={props.facets} hideStatus={props.hideStatus} />
  );

  if (!desktop)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <Sheet
          side="right"
          title={title}
          actions={clearAll}
          closeLabel="Close filters"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            props.returnFocusTo?.current?.focus();
          }}
          footer={footer}
        >
          {body}
        </Sheet>
      </Dialog>
    );
  if (!open) return null;
  return (
    <Aside
      title={title}
      actions={clearAll}
      footer={footer}
      onClose={cancel}
      focusOnOpen={props.focusOnOpen}
    >
      {body}
    </Aside>
  );
}

function Aside({
  title,
  actions,
  footer,
  children,
  onClose,
  focusOnOpen,
}: {
  title: ReactNode;
  actions: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  onClose(): void;
  focusOnOpen?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  });
  useEffect(() => {
    if (focusOnOpen) ref.current?.focus();
  }, [focusOnOpen]);
  useEffect(() => {
    const el = ref.current;
    // A calendar is portaled out of the panel, so its Esc never reaches this listener; it closes only the calendar.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) latestClose.current();
    };
    el?.addEventListener('keydown', onKey);
    return () => el?.removeEventListener('keydown', onKey);
  }, []);
  return (
    <aside
      ref={ref}
      id="filters-panel"
      aria-label="Filters"
      tabIndex={-1}
      className="bg-panel border-line rounded-tl-surface shadow-raised absolute inset-y-0 right-0 z-20 flex w-64 flex-col border-t border-l outline-none max-lg:hidden"
    >
      <header className="border-line bg-panel flex items-center justify-between gap-3 border-b py-2.5 pr-2.5 pl-4">
        <h2 className="text-ink m-0 text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close filters"
            onClick={onClose}
            className="size-8 border-transparent bg-transparent"
          >
            <X aria-hidden className="size-4" />
          </Button>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
        {children}
      </div>
      <footer className="border-line bg-surface flex gap-2 border-t px-4 py-3">
        {footer}
      </footer>
    </aside>
  );
}

type GroupsProps = {
  draft: ReturnType<typeof useFilterDraft>;
  facets: ContactFacets;
  hideStatus?: boolean;
};

function Groups({ draft: d, facets, hideStatus }: GroupsProps) {
  const desktop = useIsDesktop();
  // Open what holds a selection, plus the groups the mockups show open (more of them on desktop). Fixed at mount so editing never collapses a group.
  const [initial] = useState(() => {
    const v = d.draft;
    const set = (...x: unknown[]) => x.some(Boolean);
    return {
      status: true,
      fu: true,
      matter: desktop || set(v.matter),
      source: desktop || set(v.source),
      created: set(v.createdFrom, v.createdTo),
    };
  });

  const checks = <K extends 'status' | 'matter' | 'source'>(
    key: K,
    values: readonly NonNullable<FilterDraft[K]>[number][],
    labels: Record<string, string>,
    counts: Record<string, number>,
  ) =>
    values.map((value) => (
      <Checkbox
        key={value}
        label={labels[value]!}
        count={counts[value]}
        checked={
          (d.draft[key] as readonly string[] | null)?.includes(value) ?? false
        }
        onChange={(e) => {
          const now = new Set(d.draft[key] as readonly string[] | null);
          if (e.target.checked) now.add(value);
          else now.delete(value);
          // Keep list order stable (lead, active, closed), not click order.
          d.set({
            [key]: values.filter((v) => now.has(v)),
          } as Partial<FilterDraft>);
        }}
      />
    ));

  return (
    <>
      {!hideStatus && (
        <Group title="Status" defaultOpen={initial.status}>
          {checks('status', STATUSES, STATUS_LABEL, facets.facets.status)}
        </Group>
      )}
      <Group title="Follow-up" defaultOpen={initial.fu}>
        <FollowUp draft={d} counts={facets.facets.followUp} />
      </Group>
      <Group title="Matter type" defaultOpen={initial.matter}>
        {checks(
          'matter',
          MATTER_TYPES,
          MATTER_TYPE_LABEL,
          facets.facets.matterType,
        )}
      </Group>
      <Group title="Referral source" defaultOpen={initial.source}>
        {checks(
          'source',
          REFERRAL_SOURCES,
          REFERRAL_SOURCE_LABEL,
          facets.facets.referralSource,
        )}
      </Group>
      <Group title="Created date" defaultOpen={initial.created}>
        <DateRange
          idPrefix="filters-created"
          from={d.draft.createdFrom}
          to={d.draft.createdTo}
          error={d.errors.created && MESSAGES[d.errors.created]}
          onFrom={(createdFrom) => d.set({ createdFrom })}
          onTo={(createdTo) => d.set({ createdTo })}
        />
      </Group>
    </>
  );
}

let groupSeq = 0;
function Group({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [id] = useState(() => `filters-group-${++groupSeq}`);
  return (
    <details
      open={defaultOpen}
      className="group border-line-soft not-first:border-t not-first:pt-3"
    >
      <summary
        id={id}
        className="text-ink-2 hover:text-ink rounded-ctl mb-1 flex min-h-7 cursor-pointer list-none items-center justify-between text-xs font-semibold [&::-webkit-details-marker]:hidden"
      >
        {title}
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div role="group" aria-labelledby={id} className="flex flex-col">
        {children}
      </div>
    </details>
  );
}

const PRESETS = ['overdue', 'dueToday', 'next7Days', 'none'] as const;

function FollowUp({
  draft: d,
  counts,
}: {
  draft: GroupsProps['draft'];
  counts: ContactFacets['facets']['followUp'];
}) {
  const radio = (value: FilterDraft['fu'], label: string, count?: number) => (
    <label key={label} className={optionRow}>
      <input
        type="radio"
        name="filters-follow-up"
        checked={d.draft.fu === value}
        onChange={() => d.set({ fu: value })}
        className={`${optionMark} size-4 rounded-full checked:border-[5px]`}
      />
      {label}{' '}
      {count !== undefined && (
        <span className="tnum text-ink-2 ml-auto">
          {count.toLocaleString('en-US')}
        </span>
      )}
    </label>
  );
  return (
    <>
      {radio(null, 'Any')}
      {PRESETS.map((p) =>
        radio(
          p,
          p === 'none' ? 'No follow-up set' : FOLLOW_UP_LABEL[p],
          counts[p],
        ),
      )}
      {radio('custom', 'Custom range…')}
      {d.draft.fu === 'custom' && (
        <div className="mt-1 ml-6">
          <DateRange
            idPrefix="filters-follow-up"
            from={d.draft.fuFrom}
            to={d.draft.fuTo}
            error={d.errors.fu === 'reversed' ? MESSAGES.reversed : undefined}
            onFrom={(fuFrom) => d.set({ fuFrom })}
            onTo={(fuTo) => d.set({ fuTo })}
          />
        </div>
      )}
    </>
  );
}

function DateRange({
  idPrefix,
  from,
  to,
  error,
  onFrom,
  onTo,
}: {
  idPrefix: string;
  from: string | null;
  to: string | null;
  error?: string;
  onFrom(v: string | null): void;
  onTo(v: string | null): void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <Field id={`${idPrefix}-from`} label="From">
        <DatePicker label="From" value={from} onChange={onFrom} />
      </Field>
      <Field id={`${idPrefix}-to`} label="To" error={error}>
        <DatePicker
          label="To"
          value={to}
          onChange={onTo}
          min={from ?? undefined}
        />
      </Field>
    </div>
  );
}
