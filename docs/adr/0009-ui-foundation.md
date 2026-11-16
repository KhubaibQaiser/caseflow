# ADR-0009 — Build the UI on Radix, React Hook Form with Zod, and nuqs

## Title

Use Radix primitives with our own styling, React Hook Form with one shared Zod schema, and `nuqs` for URL state

## Status

`proposed`

## Date

2026-11-16

## Context

Spec decisions 13, 14 and 15. Forms need validation and clear error messages (G3). The list keeps search, filters, sort, page and page size in the URL (G1, G8, G9). Every screen must work with the keyboard and a screen reader at WCAG 2.2 AA. Two anti-goals apply: looking like a shadcn or "AI-generated" template, and losing user input on failure. The server must repeat the browser's validation exactly (§7.5).

## Options considered

### Option 1 — Radix primitives with our own styling (chosen)

- **Pros:** Radix handles focus management, keyboard behaviour and ARIA for Dialog, Popover, DropdownMenu and the rest, and ships unstyled. Tailwind 4 with CSS-variable tokens gives the "Intake Desk" look. Lucide icons, sonner toasts and react-day-picker inside a Radix Popover complete the set.
- **Cons:** Every primitive and every state (default, hover, focus-visible, active, disabled, loading, error) is styled by us, and that work sits in M2.

### Option 2 — shadcn defaults

- **Pros:** Ready-made styled components built on Radix.
- **Cons:** The default look is generic, which is an explicit anti-goal.

### Option 3 — React Aria

- **Pros:** Thorough accessible behaviour, unstyled.
- **Cons:** A bigger API to learn and use within a 24-hour deadline.

## Decision

Option 1. Chosen by Khubaib in the spec interview. Radix gives accessible behaviour with our own styling, avoiding the generic shadcn look and the bigger API of React Aria.

Forms (decision 14), chosen by Khubaib in the spec interview: React Hook Form with a Zod resolver, so one schema validates in the browser and again in the Server Action.

URL state (decision 15), chosen by Khubaib in the spec interview: `nuqs` for search, filters, sort, page and page size.

## Consequences

- Primitives live in `components/ui/` and are shown in the dev gallery at `/dev/components`, which is not reachable in production (§8.13).
- Zod schemas in `lib/contracts/` are the single source of truth. Server field errors map back onto the fields, and a failed save keeps the input (§8.5).
- Invalid URL parameters fall back to the defaults without an error (§8.3).
- Tests required by §9: unit tests for `ContactSchema` and for `FiltersSchema` with the URL parsers; component tests for the filters panel, the form error summary and focus, and the Move to… menu with the keyboard; axe on every route.
- README: "Component structure and state management" covers URL state with nuqs and the shared Zod contracts (§13).

## Rejected and why

- **Rejected: shadcn's default components.** They would save styling time, but their default look is the generic template look the brief judges against.
- **Rejected: React Aria.** Its accessibility is thorough, but its API is bigger than Radix's, which costs time on a 24-hour deadline.
- **Rejected: Conform for forms.** The spec records this rejection without a reason. _To be confirmed by Khubaib before this goes into the README._
- **Rejected: forms without a library.** Validation on blur after the first interaction, an error summary that moves focus, server errors mapped onto fields and dirty tracking for the unsaved-changes guard would all be written by hand.
- **Rejected: hand-rolled `useSearchParams`.** Parsing, serializing and defaulting every URL parameter, and ignoring invalid values, would be our own code to write and test.

## Sources

- Radix Primitives — https://www.radix-ui.com/primitives — read 2026-11-16
- React Hook Form — https://react-hook-form.com — read 2026-11-16
- nuqs — https://nuqs.dev — read 2026-11-16
