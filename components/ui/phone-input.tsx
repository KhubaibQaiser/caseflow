'use client';

import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/min';
import type { CountryCode } from 'libphonenumber-js/min';
import ChevronDown from 'lucide-react/icons/chevron-down';
import TriangleAlert from 'lucide-react/icons/triangle-alert';

import { cn } from '@/utils/cn';

import { useFieldControl } from './field';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const digits = (s: string) => s.replace(/\D/g, '');

const COUNTRIES = (() => {
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  return getCountries()
    .map((code) => ({
      code,
      name: names.of(code) ?? code,
      dial: getCountryCallingCode(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
})();

function localeCountry(): CountryCode {
  try {
    const region = new Intl.Locale(navigator.language).region;
    const hit = COUNTRIES.find((c) => c.code === region);
    if (hit) return hit.code;
  } catch {
    // An unknown locale falls through to US.
  }
  return 'US';
}

type State = {
  country: CountryCode;
  text: string;
  /** A stored value we cannot parse, shown as typed until edited. */
  legacy: boolean;
  /** The last value we reported or received; a different `value` prop is an outside change. */
  sent: string;
};

function init(value: string): State {
  if (!value)
    return { country: localeCountry(), text: '', legacy: false, sent: value };
  const p = parsePhoneNumberFromString(value);
  if (p?.isValid() && p.country)
    return {
      country: p.country,
      text: p.formatNational(),
      legacy: false,
      sent: value,
    };
  return { country: localeCountry(), text: value, legacy: true, sent: value };
}

// '+<country code><number>' for the form; '' when nothing is typed.
function toValue(country: CountryCode, text: string): string {
  const d = digits(text);
  if (!d) return '';
  if (text.trim().startsWith('+')) return `+${d}`;
  const a = new AsYouType(country);
  a.input(text);
  return a.getNumber()?.number ?? `+${getCountryCallingCode(country)}${d}`;
}

type Props = {
  /** '+<country code><number>', or '' for none. A stored legacy value is shown raw with a warning. */
  value: string;
  onChange(value: string): void;
  onBlur?(): void;
  'aria-describedby'?: string;
  /** For an error that belongs to a group (email or phone) rather than this field. */
  'aria-invalid'?: boolean;
};

/** A country button joined to a phone input that formats as you type. Inside a Field. */
export function PhoneInput({ value, onChange, onBlur, ...rest }: Props) {
  const field = useFieldControl(rest['aria-describedby']);
  const legacyId = `${field.id}-legacy`;
  const [s, setS] = useState(() => init(value));
  if (value !== s.sent) setS(init(value));

  const edit = (raw: string) => {
    let { country } = s;
    let text = raw;
    if (raw.trim().startsWith('+')) {
      // A pasted international number picks its own country.
      const a = new AsYouType();
      a.input(raw);
      const found = a.getCountry();
      if (found) {
        country = found;
        text = a.getNumber()?.formatNational() ?? raw;
      }
    } else if (digits(raw).length > digits(s.text).length) {
      text = new AsYouType(country).input(raw);
    } // Deleting keeps the text as typed, so a separator never grows back under the caret.
    const next = toValue(country, text);
    setS({ country, text, legacy: false, sent: next });
    onChange(next);
  };

  const pick = (country: CountryCode) => {
    const text = new AsYouType(country).input(digits(s.text));
    const next = toValue(country, text);
    setS({ country, text, legacy: false, sent: next });
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex">
        <CountryButton country={s.country} onPick={pick} />
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(512) 555-0100"
          value={s.text}
          onChange={(e) => edit(e.target.value)}
          onBlur={onBlur}
          aria-invalid={field['aria-invalid'] || rest['aria-invalid']}
          aria-describedby={
            [rest['aria-describedby'], s.legacy ? legacyId : undefined]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className="rounded-l-none"
        />
      </div>
      {s.legacy && (
        <p
          id={legacyId}
          className="text-13 text-ink m-0 flex items-start gap-1.5 font-medium"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Check this number
        </p>
      )}
    </div>
  );
}

function CountryButton({
  country,
  onPick,
}: {
  country: CountryCode;
  onPick(c: CountryCode): void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const list = useId();
  const dial = getCountryCallingCode(country);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^\+/, '');
    return t
      ? COUNTRIES.filter((c) =>
          `${c.name} ${c.code} ${c.dial}`.toLowerCase().includes(t),
        )
      : COUNTRIES;
  }, [q]);
  const current = shown[Math.min(active, shown.length - 1)];

  const choose = (code: CountryCode) => {
    onPick(code);
    setOpen(false);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const i = Math.max(0, Math.min(shown.length - 1, active + step));
      setActive(i);
      document.getElementById(`${list}-${shown[i]?.code}`)?.scrollIntoView?.({
        block: 'nearest',
      });
    } else if (e.key === 'Enter' && current) {
      e.preventDefault();
      choose(current.code);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setQ('');
        setActive(
          Math.max(
            0,
            COUNTRIES.findIndex((c) => c.code === country),
          ),
        );
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Country code: ${country} +${dial}`}
          aria-haspopup="listbox"
          className="rounded-l-ctl border-control-border bg-surface text-13 text-ink hover:border-ink-2 data-[state=open]:border-accent tnum -mr-px inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 border px-2.5 transition-colors duration-150"
        >
          {country} +{dial}
          <ChevronDown aria-hidden className="text-ink-2 size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" aria-label="Choose a country">
        <div className="border-line border-b p-2">
          <input
            role="combobox"
            aria-autocomplete="list"
            aria-expanded
            aria-controls={list}
            aria-activedescendant={current && `${list}-${current.code}`}
            aria-label="Search countries"
            autoComplete="off"
            placeholder="Search countries"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            className="rounded-ctl border-control-border bg-surface text-13 text-ink placeholder:text-ink-2 h-9 w-full border px-2.5"
          />
        </div>
        <ul
          id={list}
          role="listbox"
          aria-label="Countries"
          className="m-0 max-h-64 list-none overflow-y-auto p-1"
        >
          {shown.map((c) => (
            // Keys go to the search box (combobox pattern); the options take the mouse.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={c.code}
              id={`${list}-${c.code}`}
              role="option"
              aria-selected={c.code === country}
              onClick={() => choose(c.code)}
              className={cn(
                'rounded-ctl text-13 text-ink flex min-h-8 cursor-pointer items-center justify-between gap-3 px-2.5',
                c.code === current?.code && 'bg-track',
                c.code === country && 'font-semibold',
              )}
            >
              <span className="truncate">{c.name}</span>
              <span className="text-ink-2 tnum shrink-0">+{c.dial}</span>
            </li>
          ))}
          {shown.length === 0 && (
            <li
              role="option"
              aria-disabled="true"
              aria-selected="false"
              className="text-13 text-ink-2 px-2.5 py-2"
            >
              No country found
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
