# ADR-0010 — Handle follow-up dates in the user's time zone

## Title

Use date-fns and react-day-picker, store follow-ups as SQL `date`, and compute "today" in the user's time zone from a `tz` cookie

## Status

`accepted` (Khubaib, 2026-11-17)

## Date

2026-11-16

## Context

Spec decision 17 and §8.7. Follow-up dates drive urgency on the list and the board (G1, G4), and the form rejects a follow-up in the past (G3). "Overdue" and "Due today" must be correct for the person looking: a follow-up at 11:59pm local time is still "Today", and a user east of UTC+12 must not see wrong overdue labels (§8.9). The server renders the pages, so it needs the user's time zone. There is no firm-level settings model, and account management is a non-goal.

## Options considered

### Option 1 — date-fns, react-day-picker, and "today" in the browser's time zone (chosen)

- **Pros:** Follow-ups are SQL `date` values sent as `'YYYY-MM-DD'` strings made with date-fns `format`, never `toISOString()`, so a date never shifts. The `tz` cookie, set at login from `Intl.DateTimeFormat().resolvedOptions().timeZone`, lets the RPCs and Server Actions compute "today" for that user. react-day-picker sits inside a Radix Popover styled with our tokens.
- **Cons:** The cookie can go stale when a user travels, so `TimezoneSync` checks it on every load and refreshes. Two users in different zones can see different labels for the same contact.

### Option 2 — Native `<input type="date">`

- **Pros:** No picker dependency, and the browser supplies keyboard and mobile behaviour.
- **Cons:** The browser draws the picker, so it cannot follow the design system's DatePicker primitive and its themed states (§8.13).

### Option 3 — A firm-wide time zone

- **Pros:** Everyone at the firm sees the same "today".
- **Cons:** Needs a firm settings model and a screen for an admin to set it, both out of scope for v1.

## Decision

Option 1. Chosen by Khubaib in the spec interview. date-fns with react-day-picker and a time-zone-aware "today" keep urgency labels correct for the person looking, where computing "today" in one fixed zone would mislabel follow-ups for users far from it.

## Consequences

- The server validates the `tz` cookie with a try/catch around `new Intl.DateTimeFormat('en', {timeZone})`, not `Intl.supportedValuesOf`, which leaves out aliases such as `Asia/Calcutta` and `UTC`. The RPCs also check it against `pg_timezone_names`. Anything invalid falls back to UTC (§8.7).
- `search_contacts`, `contact_facets` and every Server Action's "not in the past" check use that zone (§7).
- Data refreshes when the window regains focus, so labels update after midnight (§8.7).
- Display uses relative labels ("Overdue · 2d", "Today") and absolute dates ("Fri, Nov 20", year only when not the current one) in the user's locale.
- Closed contacts are never flagged overdue (§6).
- Tests required by §9: unit tests for the date helpers (`toDateOnly` never shifts the date, `todayIn(tz)` across UTC+14 and UTC−11), urgency labels, and `ContactSchema` rejecting a past follow-up for a given time zone; integration test that time-zone "today" differs between two zones.
- README: a firm-wide time zone under "With more time" (§13).

## Rejected and why

- **Rejected: the browser's native date input.** The browser draws its own picker, so it looks and behaves differently in each browser and cannot follow the app's themed date picker and its states.
- **Rejected: one time zone for the whole firm.** It would give everyone the same "today", but it needs a firm settings model and a way for an admin to set it, neither of which exists in this version. It is listed as future work.

## Sources

- date-fns — https://date-fns.org — read 2026-11-16
- React DayPicker — https://daypicker.dev — read 2026-11-16
