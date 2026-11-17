# ADR-0012 — Theme: System default, per-device cookie, server-rendered data-theme

## Title

Offer System, Light and Dark, default to System, and remember the choice in a per-device cookie that the server renders as `data-theme`

## Status

`accepted` (2026-11-17). Shipped.

## Date

2026-11-17

## Context

Spec §8.13 deferred dark mode. Colours are already CSS tokens, so a second token set is cheap. The open question is how the choice is stored and applied without a flash of the wrong theme, under the nonce CSP (no inline script) and with `connection()` already making every route dynamic.

The intake team works long days, some in dim rooms, so the default must follow the OS and a person must be able to override it.

## Options considered

### Option 1 — Cookie read in the root layout, rendered as `<html data-theme>`; no attribute for System (chosen)

- **Pros:**
  - No flash: the attribute is in the server HTML. System needs no attribute, so CSS `prefers-color-scheme` decides before first paint.
  - No inline script, so the nonce CSP is untouched.
  - The toggle updates `document.cookie` and the attribute at once, with no reload.
  - Per device, and no schema or API change.
- **Cons:**
  - The root layout now reads `cookies()`. It is already dynamic, so there is no new cost.
  - The choice does not follow the person to another device.
  - Two identical dark blocks in CSS (explicit and System). A unit test asserts they match.

### Option 2 — localStorage plus a blocking inline script

- **Pros:** works without a server read; the usual pattern for static sites.
- **Cons:** needs an inline script, so a CSP nonce on it. The server HTML does not know the theme, so crawlers, previews and first paint rely on the script. Rejected for the CSP cost.

### Option 3 — Store the theme on the user profile

- **Pros:** follows the person across devices.
- **Cons:** needs a migration, a Server Action and RLS, and it makes `/login` unthemeable for a signed-out user. Too heavy for a display preference. Can be layered on later by seeding the cookie at sign-in.

### Option 4 — CSS only, `prefers-color-scheme`, no toggle

- **Pros:** the least code.
- **Cons:** no way to override the OS. Rejected.

## Rejected and why

Options 2 to 4, as above.

## Consequences

- Every screen has one theme button (`components/shell/theme-toggle.tsx`).
- New colours are added as a pair of tokens, light and dark, in `app/globals.css`.
- `lib/theme-colors.ts` is the one literal exception, for `viewport.themeColor`; a test ties it to `--canvas`.

## Sources

- Next.js docs: `cookies()` in layouts.
- WCAG 2.2 contrast (1.4.3, 1.4.11), checked per token pair in DESIGN.md.
