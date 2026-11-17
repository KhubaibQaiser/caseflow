# Caseflow runbook (detailed setup, deploy and security notes)

Caseflow is a legal-intake mini CRM. It tracks every prospective client, a contact, from first enquiry to retained or closed, so no follow-up is missed. Contacts carry a matter, a referral source and a next follow-up date, and move through Lead, Active and Closed on a pipeline board. The list is a power tool: fast search, filters and sorting by urgency, with overdue follow-ups first.

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

Sign-in is enforced by default, so `pnpm dev` needs `supabase start`, the local env file and `pnpm seed`.

## Scripts

- `pnpm dev`, `pnpm build`, `pnpm start`: run Next.js
- `pnpm typecheck`: generate route types, then `tsc --noEmit`
- `pnpm lint`: ESLint plus the colour-literal check
- `pnpm test`: unit tests
- `pnpm test:integration`: RBAC suite against the local stack (needs `supabase start`; refuses non-local URLs)
- `pnpm e2e`: Playwright end-to-end tests. Needs the local stack seeded (`pnpm seed`) and `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` and `SEED_*_PASSWORD` in the environment (specs create their own contacts as Admin). `BASE_URL` points it at a deployment; `smoke.spec.ts` is the read-only check for that. Global setup signs in Admin and Viewer once (sessions saved under `tests/e2e/.auth/`); specs run as Admin, and opt in to `storage.viewer` or `storage.signedOut` from `tests/e2e/helpers.ts`. `E2E_PORT` moves the local server off 3000
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
- `lib/data`: the server-only data layer; Supabase RPCs and queries on the request-scoped client
- `components/ui`: token-styled primitives (button, button link, field, inputs, choice groups, pills, chip, skeleton, empty and error states); forced-colours safe
  - `EmptyState` and `ErrorState` take `page` to become a whole page: the title is an h1 that takes focus on mount (`PageHeading`)
  - Overlays wrap Radix (dialog, sheet, popover, dropdown menu, tooltip); they animate on `data-state` and stand still under reduced motion
  - `DatePicker` (react-day-picker in a popover, opened by a field or your own button via `trigger`) reads and writes `'YYYY-MM-DD'` via `lib/dates`
  - `Toaster` (sonner) is mounted in the root layout; call `toast.success('Contact saved')`; `toast.error(msg, { action: { label: 'Retry', onClick } })` stays until acted on or dismissed
- `components/shell`: the app shell (`Sidebar` 196px on desktop, icon rail 768-1023px, `TabBar` plus `MobileTopBar` below 768px, `PageHeader`, `ForbiddenState`, `TimezoneSync`); `app/(app)/layout.tsx` renders it around every screen, 404 and error boundary
- `features/contacts/detail`: the detail page parts. `MoveMenu {current, onMove, disabledReason?, className?}` is reusable by the pipeline: the Radix menu (`move-menu-popup.tsx`) and the calendar load on the first click, which keeps the route at about 193 kB gzipped. `Notes` is a rich-text composer (Tiptap, loaded on demand: bold, italic, bullet and numbered lists, links; toolbar buttons with `aria-pressed` and shortcuts) that keeps the typed note on every failure (the error sits below the frame and Save note sends the draft again, with no separate Retry; Cmd/Ctrl+Enter saves once; a note typed when the session ends comes back after sign-in). Notes are stored as Tiptap JSON in `notes.body_json` (Postgres checks it is an object) with `body` as the plain-text mirror (1-2,000 characters). `addNoteAction` validates the document with the strict allowlist in `lib/contracts/rich-text.ts` (nodes, marks, attrs and http/https/mailto links only), derives the text and writes both; `features/contacts/detail/rich-text.tsx` renders the JSON as React elements, never `innerHTML`. `seed_firm` writes real documents (some with lists and links). `Timeline` is a Server Component passed into the client view as a slot, so payload parsing stays off the wire. After a move or reschedule the view shows the action's reply at once, until the revalidated page arrives. A Viewer sees Move, Edit and Reschedule `aria-disabled` with the reason, and the composer replaced
- `lib/auth`: `PermissionsProvider`, `usePermission(p)`, `<Can p>`; `viewer.ts` resolves the real viewer since T22a (PR #23)
- `lib/data/mutations.ts`: server-only writes returning `Result<T>`; PostgREST codes map to `forbidden`, `validation`, `unauthorized`, `not_found`; `updateContact` is `where updated_at = expected` and returns `conflict` when the row moved
- `features/contacts/actions.ts`: Server Actions (create, update, move, reschedule, add note). Each runs `assertPermission`, then Zod with today in the `tz` cookie, then the write, then `revalidatePath`; Zod issues become `fieldErrors` (`contactMethod` for the email/phone rule); an expired session returns `unauthorized`. No delete or undo in v1
- `features/auth/actions.ts`: `signInAction` validates, signs in through the secret-key client with `Sb-Forwarded-For` (ADR 0004), sets the session and `tz` cookie, redirects to `safeNext(next)` or `/contacts`; a 429 returns `rate_limited` (`retryAfter` in seconds, default 300). `signOutAction` clears this session only
- `lib/supabase/cookie-options.ts`: session cookies are HttpOnly, SameSite=Lax, Secure when `VERCEL_ENV` is production (server client and proxy)
- `features/auth/safe-next.ts`: accepts only same-origin paths (one leading `/`; no `//`, `\`, scheme or control characters)
- `utils/cn.ts`: class joiner built on tailwind-merge, taught our token names
- `supabase/`: local stack config and migrations (RBAC tables, contacts, notes, activities, RLS, `has_permission`, query RPCs)
- `app/(app)/[...missing]`: catches unknown URLs and calls `notFound()`, so the 404 renders in the `(app)` segment (inside the app shell once it exists); `app/not-found.tsx` is the standalone fallback
- `tests/`: `integration/` holds the RBAC suite (needs `supabase start`); `e2e/` holds Playwright specs, run against `pnpm build && pnpm start` on a seeded local stack. Every save is a real round trip. `tests/e2e/data.ts` creates a contact per test (as the seeded Admin, through RLS) so specs never share rows; the only injected failure is a dropped connection on one Server Action. Run `supabase db reset` and `pnpm seed` first, and wait a few minutes after an integration run (local sign-in rate limit)

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

`keep-alive.yml` calls the `ping()` RPC with the publishable key daily so the project does not pause (anon cannot read tables, so it never queries one).

## Security

- **XSS:** React escapes every value; there is no `innerHTML` or `dangerouslySetInnerHTML`. Rich text, when it lands, is stored and rendered through an allowlist of nodes and marks, never raw HTML.
- **CSRF:** every write is a Server Action, which is a POST that Next checks against the `Origin` header. Session cookies are HttpOnly and SameSite=Lax (Secure in production), so a cross-site request carries no session on a POST.
- **CSP:** `proxy.ts` sets a strict, nonce-based policy on every response (`lib/security/csp.ts`): scripts only from `'self'` plus the per-request nonce (`'strict-dynamic'`), `connect-src 'self'` (the browser never talks to Supabase), no framing, no plugins, `form-action 'self'`, and `upgrade-insecure-requests` in production. Styles allow `'unsafe-inline'`: sonner and Radix inject `<style>` at runtime with no nonce hook under Turbopack, and React `style` attributes can't take a nonce. Scripts stay strict. The root layout awaits `connection()`, so every route renders per request and can carry a nonce. In the browser only, Zod runs `jitless` (`lib/contracts/zod-config.ts`) so its `new Function` probe doesn't raise a violation; the server keeps Zod's JIT.
- **Headers** (`next.config.ts`): `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy` (camera, microphone, geolocation and more denied), `Cross-Origin-Opener-Policy: same-origin`, HSTS (two years, subdomains, no preload) in production only, and no `X-Powered-By`.
- **Auth layers:** the proxy checks sign-in, `requirePermission` and `assertPermission` check the role on the server, Postgres RLS is the real enforcement, and `usePermission` only shapes the UI.
- `tests/e2e/csp.spec.ts` loads the main screens and fails on any CSP violation or console error.

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

## Pipeline (T18)

`/pipeline` is the board: Lead, Active and Closed side by side from 768px, one at a time below it. It shares the list's search, quick views and Filters panel (without the Status group: the columns are the status filter, so a `?status=` in the URL is dropped).

- **Columns:** each loads its first 50 cards, ordered by urgency, with its count in the header. Each column scrolls on its own; the page doesn't. **Show 50 more · N left** is a button, not infinite scroll or virtualization: it appends the next page, moves focus to the first new card and announces it. A failed page leaves a retry in the column.
- **Cards:** name (a link; the whole card opens the contact), urgency, "matter · phone" and **Move to…**. Viewers see Move to… disabled, with "Viewers can't move contacts." on hover, focus or tap.
- **Moving:** `useOptimistic` moves the card and both counts at once. The card lands where urgency puts it (a Closed card is muted, a reopened one is overdue again if its date has passed); a card that would sort beyond the rows loaded is counted and arrives with the next page. Then the toast "{Name} moved to {Status}." (6s). A failed move puts everything back, returns focus to the card and offers **Retry** ("Move failed. Retry."); `forbidden` says "You don't have permission to move contacts."; an expired session goes to sign-in with `next`. A double-click moves once. Moving takes focus to the neighbouring card.
- **Why paging uses page numbers:** the RPC pages by number, so offsets must sit on 50-row boundaries. Moves shift the server's pages, so each load also fetches the page before and the client merges by id and urgency order; nothing is skipped or shown twice. After a move the board keeps its own state: the server refresh that follows the action doesn't replace rows the user has paged in. A new filter set remounts it.
- **States:** a three-column `loading.tsx` (one column and the tabs' place on a phone); "No Lead contacts." per empty column; the list's first-run and filtered empty states; `error.tsx` in the list's pattern with the filters kept.
- **Budget:** about 197 kB gzipped first-load JS. Date labels (open and Closed) are worked out on the server for every row, so a move can relabel a card without date-fns in the browser; the Move menu's Radix code loads on first use.
- **Not here:** drag and drop and Undo (see below). Tab choice on a phone isn't in the URL.

## RBAC in the UI

- The role badge is always visible: sidebar account block, and the Account tab on mobile.
- Write entry points a Viewer would only bounce off ("New contact", mobile "New") are hidden with `<Can p="contacts.write">`.
- In-context write actions stay visible, `aria-disabled`, with the reason as a tooltip: "Viewers can't edit contacts. Ask an admin." (`Button disabledReason`).
- A Viewer on a write URL gets `forbidden()` (403, inside the shell) or `ForbiddenState`: "You can't {action}. Your role is Viewer, which is read-only." Needs `experimental.authInterrupts`. `/dev/forbidden` shows it.

## Why no drag and drop

Moving cards only by dragging would fail WCAG 2.2 SC 2.5.7 (Dragging Movements) and exclude keyboard and many assistive-technology users. The "Move to…" menu works for everyone with a single pointer or the keyboard. Cards are ordered by urgency, so there's no manual order to drag.

## With more time

- Keyboard shortcuts (after the BRIEF requirements are fully met).
- A CSP report endpoint (`report-to`); v1 has none, so violations only show in the browser console.
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

- `lib/data/index.ts` re-exports `lib/data/supabase.ts`. It runs on the request-scoped client, so RLS applies.
- RPC replies are snake_case. They are mapped to camelCase and parsed with the contract schemas. A bad row throws `DataError` (message only, no row data).
- `getContact` returns `null` when the contact is missing or deleted. Notes and activities are newest first (ties by `id`); the timeline hides `deleted` and `restored`.
- `getPipelineColumn` offsets must be multiples of the page size; the RPC pages by number.
- `lib/auth/viewer.ts` is the entry point the app imports. It re-exports the real `lib/auth/viewer-supabase.ts`.
- `getViewer()` verifies the JWT with `getClaims()`, then reads the role from `profiles`. `requirePermission` redirects when signed out and calls Next's `forbidden()` otherwise, which renders `app/(app)/forbidden.tsx` (`experimental.authInterrupts`). `assertPermission` returns a `Result` (`forbidden` or `unauthorized`) for Server Actions, so the form keeps what was typed.
- Auth enforcement in `proxy.ts` is on by default and off only when `AUTH_ENFORCED=false` exactly (a missing variable, even on Vercel, keeps sign-in on). Nothing in CI, Playwright or the env example sets it; tooling that needs it off must opt out explicitly.
- `proxy.ts` only checks sign-in: refreshes the session, sends anonymous requests to `/login?next=…` (plus `reason=expired` if an `sb-` cookie exists), and sends signed-in users from `/login` to `/contacts`. `/dev/*` is a 404 when `VERCEL_ENV=production`.
- There is no browser Supabase client. Env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (all server-only).
- Signed in without a `profiles` row: `getViewer` throws `NoProfileError` (and `requirePermission` rethrows it; `assertPermission` returns `forbidden`). It never redirects to `/login`, which would loop. The `(app)` layout catches it and renders the No access state: "No access." / "Your account isn't set up yet. Ask an admin." with Sign out. A failed `profiles` query throws a plain `Error` (error boundary).
- `requirePermission(p, next?)` redirects to `/login?next=…&reason=expired`.
- Revocation lag: `getClaims()` checks the JWT signature, not the user record, so a banned or deleted user keeps access until the access token expires (up to 1 hour). Roles are read live from `profiles`, and RLS applies on every query.
- Sign-in throttle: Supabase limits by IP, and `signInAction` forwards `x-vercel-forwarded-for`, then the rightmost `x-forwarded-for` entry (leading entries are client-supplied), each only when `net.isIP` accepts it; otherwise nothing is forwarded and the limit falls on the server's own IP. Trade-off: the throttle is per IP only, with no per-account lockout, so the seeded passwords must be strong (a spread-out guesser is not slowed).
- A POST carrying `next-action` (a Server Action) from a dead session passes the proxy: a redirect would fail the action's fetch, and every action checks its own permission and returns `unauthorized`, which the form turns into the sign-in push.
- After an expiry the form writes a same-tab marker (`lib/auth/return-marker.ts`, `sessionStorage`, path and time only, ten minutes) before pushing `/login`. With a marker for `next`, sign-in skips the redirect (`back=1`) and calls `history.back()` so the saved draft comes back; if the page is still `/login` after a second, it does `router.replace(next)`. Without a marker (new tab, Link or proxy redirect) sign-in redirects to `next`.
- The proxy only URL-encodes `next`. T10's `safeNext` must reject values starting with `//` or `/\`.
- Auth responses carry `Cache-Control: private, no-store` from `@supabase/ssr` (proxy and redirects).

## Contact form (T17)

- `features/contacts/form/contact-form.tsx` serves `/contacts/new` and `/contacts/[id]/edit`. The pages pass the T10 actions in as props (`updateContactAction.bind(null, id)`).
- The form is loaded with `next/dynamic` and `ssr: false`: RHF, zod and the calendar stay out of the route's first load (about 176 kB gzipped, budget 220 kB), and nothing server-rendered can be submitted natively before hydration. A form-shaped skeleton fills the gap.
- Validation: blur after first touch, everything on submit. The error summary shows the errors of the last failed submit while they stay unfixed and takes focus on every failed attempt (RHF's own focus-first-error is off). Email and phone share one error under the pair.
- Save: a ref guard makes a double-click send one request. `updatedAt` goes back to the action verbatim. A failed or thrown save keeps the input and offers Retry.
- Conflict: the banner triggers `router.refresh()`; Reload latest resets the form to the refreshed record (the user re-applies their edits). There is no Overwrite. Save keeps sending the `updatedAt` the form opened with, even after the refresh hands it a newer record; only Reload latest moves the stamp.
- `unauthorized`: before pushing `/login?reason=expired&next=<page>`, the form writes its typed values and the `updatedAt` they were made against into the current history entry (`history.state.caseflowDraft`; nothing goes to sessionStorage or localStorage). Back from sign-in restores them (dirty) and clears the draft. A draft is ignored if its mode or contact id differs. A tab that is closed, or a fresh visit, starts empty.
- Limit: the draft comes back only when the user presses Back to the form after signing in. The normal sign-in redirect (`next=`) opens a fresh form. Sign-in after an expiry now goes Back (T22a), with an end-to-end test in `tests/e2e/auth.spec.ts`.
- The unsaved guard: `beforeunload` for reload and close, plus a capture-phase click handler that turns same-origin link clicks (sidebar, breadcrumb, any `Link`) into the "Discard changes?" dialog while dirty. Cancel keeps the input. Programmatic pushes and the Back button can't be intercepted.
- Matter type has no default ("Choose a matter type"); an empty submit reports it with the name and the email-or-phone rule.
- `/dev/contact-form?outcome=conflict|slow|fail` is a dev fixture with a scripted save (404 in production).
