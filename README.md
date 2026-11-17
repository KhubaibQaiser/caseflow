# Caseflow

Caseflow is a legal-intake mini CRM. It tracks every prospective client, a contact, from first enquiry to retained or closed, so no follow-up is missed. Contacts carry a matter, a referral source and a next follow-up date, and move through Lead, Active and Closed on a pipeline board. The list is a power tool: fast search, filters and sorting by urgency, with overdue follow-ups first.

## Status

- M0 is done: scaffold, contracts, date helpers, design tokens and a fake data layer.
- App-level 404 and error pages are done (T12b): unknown URLs return 404 inside the `(app)` segment, and `app/error.tsx` shows the reason class, Retry and the error digest. `app/global-error.tsx` catches root-layout crashes with its own document, tokens and a Reload button.
- FE: UI primitives in `components/ui` (base controls, Radix-based overlays, date picker, toaster), shown in every state at `/dev/components` (dev only; 404 in production).
- FE: the contacts list at `/contacts` (T14), on the fake data layer until T22. The filters panel is T15 (done).
- Login page is done (T19): `/login` (`app/(auth)/login`, `features/auth/login-form.tsx`) wires `signInAction`. Validates with `SignInSchema` on submit and focuses the first bad field. One alert for `invalid_credentials`, `rate_limited` (Sign in stays disabled for `retryAfter`) and `server`. `?reason=expired` shows the session-ended banner, and `?next=` round-trips through a hidden field (the action runs `safeNext`). `components/shell/no-access-state.tsx` is the presentational No access screen; the `(app)` layout renders it on `NoProfileError` in T22. `/dev/auth` shows every state with canned results (404 in production).
- Next: the BE (Supabase), FE (screens) and OPS (CI and deploy) tracks.
- Live URL: not deployed yet.

## Stack

Next.js 16 (App Router, Server Components and Server Actions), React 19, TypeScript, Tailwind CSS 4, Radix primitives, TanStack Table and Virtual, React Hook Form, Zod 4, nuqs, date-fns, Supabase (Postgres, Auth, RLS), Vitest, Playwright.

## Prerequisites

- Node 24 (`.nvmrc`)
- pnpm 10 via `corepack enable`
- Supabase CLI 3.2 or later
- Docker, for the local Supabase stack

## Getting started

```sh
pnpm install
cp .env.example .env.local   # fill in the values printed by `supabase start`
supabase start
pnpm dev
```

M0 runs on the fake data layer, so `pnpm dev` works without `supabase start` or the local env file.

## Scripts

- `pnpm dev`, `pnpm build`, `pnpm start`: run Next.js
- `pnpm typecheck`: generate route types, then `tsc --noEmit`
- `pnpm lint`: ESLint plus the colour-literal check
- `pnpm test`: unit tests
- `pnpm test:integration`: RBAC suite against the local stack (needs `supabase start`; refuses non-local URLs)
- `pnpm e2e`: Playwright end-to-end tests
- `pnpm format`, `pnpm format:check`: Prettier
- `pnpm seed`: create the role accounts and reset the firm data (see Seeding below)
- `pnpm db:types`: regenerate Supabase types from the local stack

## Seeding

`pnpm seed` needs `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SEED_ADMIN_PASSWORD` and `SEED_VIEWER_PASSWORD` in the environment (names are in `.env.example`; it refuses to run without them and never prints them). It creates two accounts, `admin@caseflow.test` (Alex Morgan, admin) and `viewer@caseflow.test` (Sam Patel, viewer), then runs `seed_firm`, which wipes the contacts, notes and activities and generates 2,500 contacts with their notes and activity history. The data is deterministic and dated relative to today.

Re-running is safe: accounts are updated in place (the passwords are reset to the current env values) and the firm data returns to the same counts. Use it to restore a broken demo. Integration tests wipe the local firm data, so re-run `pnpm seed` afterwards.

## Project structure

Layering is `app -> features -> components -> lib -> utils`. Nothing imports upward.

- `lib/contracts`: Zod schemas and types shared by browser and server (contact, filters, list query, facets, permissions, results)
- `lib/dates`: date-only helpers; dates cross the wire as `'YYYY-MM-DD'` strings
- `lib/data`: the server-only data layer; a fake in-memory implementation for now, swapped for Supabase later
- `components/ui`: token-styled primitives (button, button link, field, inputs, choice groups, pills, chip, skeleton, empty and error states); forced-colours safe
  - `EmptyState` and `ErrorState` take `page` to become a whole page: the title is an h1 that takes focus on mount (`PageHeading`)
  - Overlays wrap Radix (dialog, sheet, popover, dropdown menu, tooltip); they animate on `data-state` and stand still under reduced motion
  - `DatePicker` (react-day-picker in a popover, opened by a field or your own button via `trigger`) reads and writes `'YYYY-MM-DD'` via `lib/dates`
  - `Toaster` (sonner) is mounted in the root layout; call `toast.success('Contact saved')`; `toast.error(msg, { action: { label: 'Retry', onClick } })` stays until acted on or dismissed
- `components/shell`: the app shell (`Sidebar` 196px on desktop, icon rail 768-1023px, `TabBar` plus `MobileTopBar` below 768px, `PageHeader`, `ForbiddenState`, `TimezoneSync`); `app/(app)/layout.tsx` renders it around every screen, 404 and error boundary
- `lib/auth`: `PermissionsProvider`, `usePermission(p)`, `<Can p>`; `viewer.ts` is a fake viewer until T22 (`fake-role` cookie picks admin or viewer; production is always admin)
- `lib/data/mutations.ts`: server-only writes returning `Result<T>`; PostgREST codes map to `forbidden`, `validation`, `unauthorized`, `not_found`; `updateContact` is `where updated_at = expected` and returns `conflict` when the row moved
- `features/contacts/actions.ts`: Server Actions (create, update, move, reschedule, add note). Each runs `assertPermission`, then Zod with today in the `tz` cookie, then the write, then `revalidatePath`; Zod issues become `fieldErrors` (`contactMethod` for the email/phone rule); an expired session returns `unauthorized`. No delete or undo in v1
- `features/auth/actions.ts`: `signInAction` validates, signs in through the secret-key client with `Sb-Forwarded-For` (ADR 0004), sets the session and `tz` cookie, redirects to `safeNext(next)` or `/contacts`; a 429 returns `rate_limited` (`retryAfter` in seconds, default 300). `signOutAction` clears this session only
- `lib/supabase/cookie-options.ts`: session cookies are HttpOnly, SameSite=Lax, Secure when `VERCEL_ENV` is production (server client and proxy)
- `features/auth/safe-next.ts`: accepts only same-origin paths (one leading `/`; no `//`, `\`, scheme or control characters)
- `utils/cn.ts`: class joiner built on tailwind-merge, taught our token names
- `supabase/`: local stack config and migrations (RBAC tables, contacts, notes, activities, RLS, `has_permission`, query RPCs)
- `app/(app)/[...missing]`: catches unknown URLs and calls `notFound()`, so the 404 renders in the `(app)` segment (inside the app shell once it exists); `app/not-found.tsx` is the standalone fallback
- `tests/`: `integration/` holds the RBAC suite (needs `supabase start`); `e2e/` holds Playwright specs, run against `pnpm build && pnpm start`

## CI

`.github/workflows/ci.yml` runs on every pull request and push to `main`:

- `checks`: format check, typecheck, lint (including the colour-literal check), unit tests, build.
- `integration-e2e`: local Supabase (CLI 3.2), `db reset`, seed when `scripts/seed.ts` exists, integration tests, and e2e when `tests/e2e` exists.
- `checks` also runs `pnpm size` after the build: gzipped first-load JS per route (root chunks plus the chunks in each route's client-reference manifest) must stay at or under 220 kB. `/dev/*` is exempt. Shell routes are about 179 kB, `/contacts` about 215 kB, `/` about 169 kB; the Next runtime alone is about 131 kB. Anything heavy that isn't needed on first paint is lazy (every tooltip, the mobile Account sheet).
- `gitleaks`: secret scan of each PR's or push's commits.

Actions are pinned by commit SHA. Dependabot opens weekly grouped minor and patch updates for npm and GitHub Actions. PRs use `.github/pull_request_template.md`; `.github/CODEOWNERS` assigns review.

PRs that add or change a UI component or page include desktop (1440) and mobile (375) screenshots, hosted on the orphan `screenshots` branch under `screenshots/pr-<n>/`.

## Deploy

Going live:

1. Set the `DEPLOY_ENABLED` repository variable to `true` (`gh variable set DEPLOY_ENABLED --body true`). Until then deploys and the keep-alive are off. The Vercel env vars (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `AUTH_ENFORCED=true`) come from the deploy sync; nothing is set by hand.
2. Push to `main`. `.github/workflows/deploy.yml` runs after CI passes on that push.
3. Run the seed workflow once: `gh workflow run seed.yml` (manual, `main` only; restores the demo accounts and data).
4. Go-live checklist (Supabase dashboard): sign-ups are disabled (a sign-up call with the publishable key must fail), auth rate limits are sane, and the site URL and redirect URLs match the Vercel domain.

What `deploy.yml` does, in order:

- Guard: skips the run if its commit is no longer the tip of `main`.
- `supabase db push` migrates the production project.
- Syncs the Vercel production env: Supabase vars from GitHub secrets (the secret key is sensitive) and `AUTH_ENFORCED=true`.
- `vercel build --prod`, then a second tip check. If `main` moved on, the deploy and smoke steps are skipped with a notice, so an old run never overwrites a newer deploy. Skipped runs are green, not failed.
- `vercel deploy --prebuilt --prod`. Vercel's Git auto-deploy is off and there are no PR previews.
- Smoke test (`tests/e2e/smoke.spec.ts`) against the deployed URL, once that file exists.

`keep-alive.yml` pings Supabase daily so the project does not pause.

## Docs

- `docs/SPEC.md`: the binding spec
- `docs/PLAN.md`: the implementation plan
- `docs/DECISIONS.md` and `docs/adr/`: decisions and ADRs
- `DESIGN.md`: design system
- `AGENTS.md`: rules for agents and contributors

## Contacts list

`/contacts` is a Server Component: it parses the URL with `loadListQuery`, fetches rows and facet counts in parallel, and redirects a stale `?page=` to the last page. Bad params fall back to defaults.

- **URL is the state.** Search, filters, sort, page and page size live in the query string (nuqs, `useListQuery`), so a list can be shared, refreshed and walked with back and forward. Any change except the page itself resets to page 1. Search updates the box at once and the URL 250ms after the last key, so only the final query reaches the server.
- **Toolbar:** search (Esc clears), the Filters button with an applied-group count, quick views (All, Overdue, Due today) as links with live counts, removable chips (focus moves to the next chip, then the Filters button), and a Sort menu below 768px.
- **Table** (768px and up): TanStack Table in manual mode with TanStack Virtual (36px rows, overscan 12) inside real `<table>` markup with `aria-rowcount` and `aria-rowindex`. Sortable headers are buttons inside `th[aria-sort]`. Columns are fixed width, so long names and emails truncate with a `title` tooltip and never widen the table; Name stays pinned when the table scrolls sideways. Changing page scrolls to the top and focuses the table caption.
- **Cards** (below 768px): name and follow-up, then matter, status and a `tel:` link. `content-visibility: auto` keeps 500 cards cheap without virtualizing.
- **Filters panel (T15):** status, follow-up (presets or a custom range), matter type, referral source and created range, each option with its facet count (every group counts with its own filter left out). Edits go to a draft; **Apply** writes the URL once (page back to 1) and closes, **Cancel**, ✕ and Esc discard and return focus to the Filters button. Apply is blocked, with the reason, for a Custom range with no date or an end before its start (an equal range is fine). From 1024px it is a non-modal panel under the toolbar whose open state is kept in the `filters_open` cookie; below that it is a modal sheet that always starts closed. Its code (calendar included) loads on first hover, focus or open, so it stays out of `/contacts` first-load JS. Unapplied edits reset when the applied URL changes while the panel is open (a chip removed, Back), so the panel never shows filters that are no longer applied. Each group's title carries its selected count ("Matter type · 2").
- **States:** a table-shaped `loading.tsx`; while the next rows load the old ones stay at full contrast, the list is `aria-busy` and a thin accent bar runs along its top edge; first-run and filtered empty states (the filtered one lists what's applied and offers Clear filters); `error.tsx` names the reason class, keeps the filters and retries the segment with Next's `retry()`.
- **Budget:** about 215 kB gzipped first-load JS. Date labels are computed on the server, zod stays off the client, and the sort menu loads lazily.

## RBAC in the UI

- The role badge is always visible: sidebar account block, and the Account tab on mobile.
- Write entry points a Viewer would only bounce off ("New contact", mobile "New") are hidden with `<Can p="contacts.write">`.
- In-context write actions stay visible, `aria-disabled`, with the reason as a tooltip: "Viewers can't edit contacts. Ask an admin." (`Button disabledReason`).
- A Viewer on a write URL gets `forbidden()` (403, inside the shell) or `ForbiddenState`: "You can't {action}. Your role is Viewer, which is read-only." Needs `experimental.authInterrupts`. `/dev/forbidden` shows it.

## Why no drag and drop

Moving cards only by dragging would fail WCAG 2.2 SC 2.5.7 (Dragging Movements) and exclude keyboard and many assistive-technology users. The "Move to…" menu works for everyone with a single pointer or the keyboard. Cards are ordered by urgency, so there's no manual order to drag.

## With more time

- Keyboard shortcuts (after the BRIEF requirements are fully met).
- Undo for pipeline moves (for later review).

## Decisions that differ from the spec

- Deleting contacts is out of scope for v1: there's no delete UI, and the `deleted_at` column stays unused.
- The focus style adds a 2px accent outline to the spec ring for 3:1 contrast.
- Control borders are darker than the mockups (`#7F8D87`) for 3:1 contrast.
- Closed contacts with a follow-up date sort after open dated contacts.

## Audit and activity (database triggers)

Postgres triggers stamp `created_by`, `created_at`, `updated_by` and `updated_at`, so clients cannot forge them. Soft delete needs `contacts.delete`, enforced in the database. Every contact change and every note writes an activity row. Seeding skips logging only when there is no signed-in user, through the service-role `seed_insert_contact`.

## Query RPCs

`search_contacts` (rows, `total`, `matching`) and `contact_facets` (counts per filter group, each leaving out its own group) share one set of per-row filter flags, `contact_flags`. They run as the caller, so RLS applies, and they are callable by `authenticated` only. Filters are normalised in SQL first: bad values are ignored, an unknown `tz` falls back to UTC, and page and size are clamped. "Today" and the created-date filter use the `tz` argument. `ping()` returns true for the anon keep-alive job.

## Data layer, viewer and proxy

- `lib/data/supabase.ts` has the same signatures as `lib/data/fake.ts`; T22 flips `lib/data/index.ts`. It runs on the request-scoped client, so RLS applies.
- RPC replies are snake_case. They are mapped to camelCase and parsed with the contract schemas. A bad row throws `DataError` (message only, no row data).
- `getContact` returns `null` when the contact is missing or deleted. Notes and activities are newest first (ties by `id`); the timeline hides `deleted` and `restored`.
- `getPipelineColumn` offsets must be multiples of the page size; the RPC pages by number.
- `lib/auth/viewer.ts` is the entry point the app imports and is still the fake (T13). The real one is `lib/auth/viewer-supabase.ts`; T22 flips `viewer.ts` to re-export it, like `lib/data/index.ts`.
- `getViewer()` (viewer-supabase) verifies the JWT with `getClaims()`, then reads the role from `profiles`. `requirePermission` redirects when signed out and throws `ForbiddenError` otherwise (`forbidden()` is still experimental). `assertPermission` returns a `Result` for actions.
- Auth enforcement in `proxy.ts` is off until T22 sets `AUTH_ENFORCED=true` locally and in CI; Vercel gets it from the deploy env sync. While off, the proxy passes every request through; only the production `/dev/*` 404 stays on.
- `proxy.ts` only checks sign-in: refreshes the session, sends anonymous requests to `/login?next=…` (plus `reason=expired` if an `sb-` cookie exists), and sends signed-in users from `/login` to `/contacts`. `/dev/*` is a 404 when `VERCEL_ENV=production`.
- There is no browser Supabase client. Env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (all server-only).
- Signed in without a `profiles` row: `getViewer` throws `NoProfileError` (and `requirePermission` rethrows it; `assertPermission` returns `forbidden`). It never redirects to `/login`, which would loop. The `(app)` layer (T13/T22) must catch it and render the No access state: "No access." / "Your account isn't set up yet. Ask an admin." with Sign out. A failed `profiles` query throws a plain `Error` (error boundary).
- `requirePermission(p, next?)` redirects to `/login?next=…&reason=expired`.
- Revocation lag: `getClaims()` checks the JWT signature, not the user record, so a banned or deleted user keeps access until the access token expires (up to 1 hour). Roles are read live from `profiles`, and RLS applies on every query.
- The proxy only URL-encodes `next`. T10's `safeNext` must reject values starting with `//` or `/\`.
- Auth responses carry `Cache-Control: private, no-store` from `@supabase/ssr` (proxy and redirects).

## Contact form (T17)

- `features/contacts/form/contact-form.tsx` serves `/contacts/new` and `/contacts/[id]/edit`. The pages pass the T10 actions in as props (`updateContactAction.bind(null, id)`); T22 only swaps the data source.
- The form is loaded with `next/dynamic` and `ssr: false`: RHF, zod and the calendar stay out of the route's first load (about 176 kB gzipped, budget 220 kB), and nothing server-rendered can be submitted natively before hydration. A form-shaped skeleton fills the gap.
- Validation: blur after first touch, everything on submit. The error summary shows the errors of the last failed submit while they stay unfixed and takes focus on every failed attempt (RHF's own focus-first-error is off). Email and phone share one error under the pair.
- Save: a ref guard makes a double-click send one request. `updatedAt` goes back to the action verbatim. A failed or thrown save keeps the input and offers Retry.
- Conflict: the banner triggers `router.refresh()`; Reload latest resets the form to the refreshed record (the user re-applies their edits). There is no Overwrite. Save keeps sending the `updatedAt` the form opened with, even after the refresh hands it a newer record; only Reload latest moves the stamp.
- `unauthorized`: before pushing `/login?reason=expired&next=<page>`, the form writes its typed values and the `updatedAt` they were made against into the current history entry (`history.state.caseflowDraft`; nothing goes to sessionStorage or localStorage). Back from sign-in restores them (dirty) and clears the draft. A draft is ignored if its mode or contact id differs. A tab that is closed, or a fresh visit, starts empty.
- Limit: the draft comes back only when the user presses Back to the form after signing in. The normal sign-in redirect (`next=`) opens a fresh form. Returning through history after an expiry, with an end-to-end test against real auth, is planned for T22.
- The unsaved guard: `beforeunload` for reload and close, plus a capture-phase click handler that turns same-origin link clicks (sidebar, breadcrumb, any `Link`) into the "Discard changes?" dialog while dirty. Cancel keeps the input. Programmatic pushes and the Back button can't be intercepted.
- Matter type has no default ("Choose a matter type"); an empty submit reports it with the name and the email-or-phone rule.
- `/dev/contact-form?outcome=conflict|slow|fail` is a dev fixture with a scripted save (404 in production).
