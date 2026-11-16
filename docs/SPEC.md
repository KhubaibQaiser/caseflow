# Caseflow: Mini CRM for legal intake. Design spec

Status: **draft for approval** · Date: 2026-11-16 · Owner: Khubaib (decides) · Author: Claude (proposes)

Companion files: `PRODUCT.md` (product truth, Impeccable), `docs/BRIEF.md` (the case study, verbatim), `docs/DECISIONS.md` (decision log), `docs/adr/` (architecture decisions), `design/mockups/direction-c-v5.html` + `design/mockups/screens-v1.html` (approved visual direction).

---

## 1. Intent

Build and deploy a small CRM for a law firm's client intake team as a **Senior Frontend Engineer case study**. It will be judged on UX and visual judgement, code quality, product sense and the quality of the explanations. The frontend must be **impeccable**: responsive, accessible, fast, distinctive (not generic AI UI), and complete across every state and edge case. The backend must be **smart enough** to support every requirement honestly at realistic volume, without becoming the focus. CI/CD must be strong, and visible in the repo.

Deadline: 24h from receipt of the brief. Functional deliverables come before polish.

## 2. Goals, non-goals, anti-goals

**Goals (all mandatory, from the brief)**
- G1 Contacts list with search, status filter (Lead, Active, Closed) and sorting.
- G2 Contact detail page with the contact's information, notes and an activity timeline.
- G3 Create and edit forms with validation and clear error messages.
- G4 Pipeline board with one column per status, where contacts can be moved between statuses.
- G5 Loading, empty and error states on **every** screen.
- G6 Data persists across refreshes. The app is responsive: excellent on desktop, usable on mobile.
- G7 Live Vercel link, a GitHub repo with a meaningful commit history, and a README of at most one page.

**Goals we added (agreed in the spec interview)**
- G8 Realistic volume: about 2,500 seeded contacts in the firm workspace. Server-side pagination, with page size 25/50/100/250/500 and a default of 250. Virtualized rows.
- G9 Advanced filters in a right-hand panel, with Apply and Cancel, facet counts, an active-filter count, removable chips, and "quick views" (All, Overdue, Due today).
- G10 **RBAC with two seeded roles:** Admin (full access) and Viewer (read-only). It's enforced in Postgres (RLS) and the server, and reflected in the UI with disabled controls that give the reason, plus a forbidden page. Login is an email and password form. There's no self sign-up.
- G11 Strong CI/CD: checks on every PR (including integration and e2e tests against a local Supabase), and an ordered migrate → deploy → smoke test pipeline on `main`.

**Non-goals (documented in the README as future work)**
- Drag and drop on the pipeline. It can be added later on top of the menu, which WCAG 2.5.7 requires anyway.
- Global search (an icon in the header that opens a modal searching every object) and keyboard shortcuts (a command palette, j/k to move through rows, quick status changes).
- More roles (coordinator, attorney). The permission model already supports them, and each would be one seed change.
- Self sign-up, password reset, account management. A nightly data reset. PR preview deploys: a staging Supabase project and preview workflow are future work, and the README lists this as known.
- Live facet counts that follow the draft filters, with an "Apply · N contacts" preview.
- Motion beyond CSS transitions. Editing or deleting notes. Assigned attorney, conflict checks, documents. MFA and SSO.

**Anti-goals (it fails even if it works)**
- Looks like a shadcn or "AI-generated" template, or uses generic marketing copy.
- Any screen missing a loading, empty or error state, or any state that lies (counts that contradict the filters, a toast saying "Saved" when nothing was saved).
- Losing user input on failure.
- An accessibility regression: colour as the only signal, inputs without labels, focus traps that don't release, or text below 4.5:1 contrast.
- A live link that is down when reviewed.

## 3. Users and constraints

See `PRODUCT.md`. In short:
- **Users:** intake coordinators, who are on calls and capturing quickly, and intake managers or attorneys, who triage. Both are equal primary users.
- **Reviewers** arrive cold through a link.
- **Voice:** crisp power-tool.
- **Name:** **Caseflow**.
- **Terminology:** contact, matter, follow-up, Lead/Active/Closed. Never "deal" or "customer".

## 4. Approaches and decisions (summary)

Every row was decided by Khubaib in the spec interview, unless it is marked *(Claude's call)*. ADRs carry the full options and the rejected alternatives.

| # | Decision | Chosen | Rejected (why) | ADR |
|---|---|---|---|---|
| 1 | Backend | **Supabase free plan** (Postgres, Auth, RLS). The free tier pauses after 7 idle days, so a daily keep-alive GitHub Action prevents it. One firm workspace of about 2.5k contacts, roughly 3MB. | localStorage (not a real backend); Neon with a custom API (+2–3h) | 0001 |
| 2 | Rendering and data | **Next.js App Router. RSC for reads, Server Actions for writes, `useOptimistic` for moves.** Sessions live in httpOnly cookies. | TanStack Query against Supabase from the browser (token in localStorage, open to XSS); Vite SPA (Next is preferred) | 0002 |
| 3 | Auth and RBAC | **Pre-seeded accounts, one per role** (Admin, Viewer), created by an idempotent seed script through the admin API. **Email and password form only.** Sign-ups are disabled in Supabase. Everyone works in **one shared firm workspace**. Roles and permissions live in the database (`profiles`, `role_permissions`), and `has_permission()` drives RLS. There's no intro modal; the limitations are in the README. | Email-only login with HMAC-derived passwords and private workspaces (no real RBAC); anonymous sign-in; magic link | 0003 |
| 4 | Abuse limits | With no sign-ups, the only public surface is sign-in. Supabase's per-IP sign-in limits apply **with the client IP forwarded** (`Sb-Forwarded-For` plus a secret key), so each reviewer is limited individually, not the Vercel server. | Vercel WAF rule (nothing left to protect); a Postgres limiter; Upstash | 0004 |
| 5 | Broken data or account | Operator re-runs the `seed` workflow (idempotent: it re-creates the accounts and resets firm data to the seed). Documented in the README. There's no in-app reset button and no nightly reset. | Admin "Reset demo data" button; nightly reset cron | 0003 |
| 6 | Pipeline moves | **A "Move to…" menu only.** Drag and drop is a future enhancement. | DnD plus menu (+1.5h); DnD only (fails WCAG 2.5.7) | 0005 |
| 7 | Board order | **Urgency:** overdue first, then due today, then soonest follow-up, then no follow-up. Ties go to the most recently updated. No manual ordering, so there is no `position` column. *(Claude's call, not objected to.)* | Manual ordering (needs a rank column and DnD) | 0005 |
| 8 | List at volume | **Server offset pagination with an exact count, plus TanStack Virtual.** Default page size 250. The accessibility cost (Ctrl+F only finds rendered rows) is stated in the README and mitigated by the advanced filters. | Pagination only at 50 (no virtualization needed); infinite scroll | 0006 |
| 9 | Query layer | **Two Postgres RPCs, `search_contacts` and `contact_facets`, sharing one SQL predicate,** so the list and the counts cannot disagree. Run as SECURITY INVOKER, so RLS still applies. | PostgREST builder plus separate count queries (logic duplicated in two places); filtering in the browser (doesn't work at volume) | 0007 |
| 10 | Search | **Partial match** (`ilike`, no trigram index needed at about 2.5k rows) across name, email, phone digits and matter summary. | `websearch_to_tsquery` syntax (no partial words); a field-scoped `status:lead` syntax (+2h, future) | 0007 |
| 11 | Filters UX | A right-hand panel opened by the Filters button. **It floats over the table on desktop (no reflow) and is a sheet on mobile.** It works on a **draft**: **Apply applies and closes**, Cancel, ✕ and Esc discard, and Clear all resets the draft. Counts reflect the applied filters. Toolbar chips act immediately. | Applying instantly (the user chose Apply); live draft counts (future) | n/a (DECISIONS) |
| 12 | Deploy pipeline | **GitHub Actions on `main`:** checks → `supabase db push` → `vercel deploy --prebuilt --prod` → production smoke test. **No PR previews** (a known gap); PRs are gated by CI against a local Supabase. | Vercel Git integration plus a separate migration job (they race); previews against the production database (break on migrations) | 0008 |
| 13 | Components | **Radix primitives with our own styling.** Tailwind 4 with CSS-variable tokens. Lucide icons. sonner toasts. react-day-picker inside a Radix Popover. | shadcn defaults (generic look); React Aria (bigger API) | 0009 |
| 14 | Forms | React Hook Form with a Zod resolver. **One schema** shared by the browser and the Server Action. | Conform; no library | 0009 |
| 15 | URL state | `nuqs` for search, filters, sort, page and page size. | Hand-rolled `useSearchParams` | 0009 |
| 16 | Motion | **CSS-only transitions** (Radix `data-state` keyframes, `@starting-style`), with reduced motion respected. `motion` is noted as a trade-off. | `motion` library | n/a |
| 17 | Dates | date-fns plus react-day-picker. **Time-zone-aware "today"** (see §8.7). | Native `<input type="date">` | 0010 |
| 18 | Visual direction | **C v5, "Intake Desk", refined:** sage, Figtree only, 36px rows, neutral status pills, warm colours only for urgency, left nav, right filters panel, bottom tab bar on mobile. Critiqued with Impeccable (25/40 before the fixes; contrast findings cleared after). | A "Counsel" (letterhead serif); B "Docket" (Linear-like) | n/a (PRODUCT/DESIGN) |
| 19 | Test strategy | TDD on critical paths only: Vitest unit tests, integration tests against a local Supabase, Playwright e2e with axe. | Coverage targets | n/a |
| 20 | RBAC scope | **Two roles: Admin and Viewer.** Four layers: proxy (logged in?) → server `requirePermission` → Postgres RLS (the real enforcement) → client `usePermission` (UI only). The role is read from `profiles`, so changes take effect immediately. | A role claim in the JWT via the custom access token hook (stale for up to 1h; a scaling option); three or four roles | 0003 |

## 5. Architecture

```
Browser ──HTTPS──► Next.js on Vercel (Node runtime)
                    ├─ proxy.ts: session refresh + "logged in?" redirect (authN only)
                    ├─ RSC pages: requirePermission → lib/data/* → Supabase (user's JWT, RLS)
                    ├─ Server Actions: requirePermission → Zod-validate → Supabase (RLS) → revalidate
                    └─ signIn/signOut Server Actions → Supabase Auth (password, Sb-Forwarded-For) → httpOnly cookies
                         │
                         ▼
                   Supabase: Postgres (RLS, triggers, RPCs) + Auth
GitHub Actions: CI on PR · migrate+deploy on main · seed (manual) · keep-alive cron
```

- **Next.js version:** use the version pinned by `create-next-app@latest` at scaffold time (16.x), with Node 24 LTS and pnpm 10. Before writing route, proxy or caching code, read the bundled docs in `node_modules/next/dist/docs/`. Next 16 renamed `middleware` to `proxy`.
- **Folder layout and dependency direction:** `app → features → components → lib → utils`. Nothing imports upward.
  - `app/`: routes, layouts, `loading.tsx`, `error.tsx`, `not-found.tsx`.
  - `features/contacts/`, `features/pipeline/`, `features/auth/`: feature components, Server Actions, hooks.
  - `components/ui/`: design-system primitives (Button, Input, Select, Dialog, Sheet, Popover, Menu, Chip, Badge/Pill, Skeleton, EmptyState, ErrorState, Toast wiring).
  - `lib/contracts/`: Zod schemas and TS types, **the contract every workstream shares**.
  - `lib/data/`: server-only data access (Supabase clients, RPC wrappers, mappers).
  - `lib/auth/`: session helpers, `getViewer()` (user plus profile plus permissions, wrapped in `cache()`), `requirePermission()`, and the client `PermissionsProvider`, `usePermission` and `<Can>`.
  - `lib/dates/`: time-zone helpers.
  - `supabase/migrations/`, `supabase/seed/`: schema, RLS, triggers, RPCs, seed function.
  - `e2e/`, `tests/integration/`, and co-located `*.test.ts` unit tests.
- **Secrets:** the Supabase secret key and the seeded account passwords (`SEED_ADMIN_PASSWORD`, `SEED_VIEWER_PASSWORD`, used only by the seed script) exist only in a `server-only` module or the seed script, and in Vercel and GitHub encrypted environment variables. Gitleaks runs in CI. `.env.example` lists names only.

## 6. Data model

**One firm workspace.** All authenticated users share it, and what each user can do is set by their role. Every table has RLS enabled.

**RBAC tables**
- `app_role enum` (admin, viewer). `app_permission enum` (contacts.read, contacts.write, contacts.delete, notes.write).
- `profiles`: `user_id uuid pk → auth.users on delete cascade`, `display_name text`, `role app_role`.
- `role_permissions`: `(role, permission)` primary key, seeded with admin getting all four permissions and viewer getting `contacts.read`.
- `has_permission(p app_permission) returns boolean`: STABLE, SECURITY DEFINER, with `search_path` locked. It checks whether `role_permissions` holds the caller's `profiles.role` paired with `p`. Policies call it as `(select has_permission('…'))` so it's evaluated once per statement.
- A user can read their own `profiles` row, and display names of all profiles (needed for "who did what"). There are no client writes to profiles or `role_permissions`.

**`contacts`**
- `id uuid pk`
- `full_name text` (2–120 characters, trimmed)
- `email text null`, `phone text null`, `phone_digits text generated` (digits only, for search)
- **Check:** at least one of email or phone is present.
- `matter_type matter_type enum` (personal_injury, family, immigration, employment, estate_planning, criminal_defense)
- `referral_source referral_source enum null` (google_search, past_client, attorney_referral, bar_referral, website_form)
- `status contact_status enum` (lead, active, closed; default lead)
- `follow_up_on date null`
- `summary text null` (at most 1,000 characters)
- `created_by`, `updated_by → profiles`
- `created_at timestamptz`, `updated_at timestamptz` (maintained by a trigger, which also sets `updated_by = auth.uid()`)
- `deleted_at timestamptz null`: soft delete, so Undo is possible *(Claude's call)*.
- **RLS:**
  - select needs `contacts.read` (and `deleted_at is null`, except through the restore path)
  - insert and update need `contacts.write`
  - a BEFORE UPDATE trigger rejects changes to `deleted_at` unless the caller has `contacts.delete`
  - no hard deletes from clients
- **Indexes:** `(status, follow_up_on)`, `(created_at)`, a partial index `where deleted_at is null`. **No trigram indexes** *(Claude's call)*: at about 2.5k rows, `ilike '%q%'` takes about 1ms. README scale path: add `pg_trgm` GIN indexes past about 50k rows.

**`notes`**
- `id`, `contact_id → contacts on delete cascade`, `author_id → profiles`, `body text` (1–2,000 characters), `created_at`
- Add-only in v1.
- **RLS:** select needs `contacts.read`; insert needs `notes.write` and `author_id = auth.uid()`.

**`activities`**
- `id`, `contact_id`, `actor_id → profiles`, `type activity_type` (created, updated, status_changed, follow_up_changed, note_added, deleted, restored), `payload jsonb` (for example `{from, to}` or `{fields: [...]}`), `created_at`
- **Written only by triggers**, on contacts insert/update and notes insert, with `actor_id = auth.uid()`. The client never writes activities: RLS allows select only, with `contacts.read`.

**Seeding** (`supabase/seed/` plus `scripts/seed.ts`, idempotent)
- **Accounts:** the script creates or updates two Auth users with the admin API (`email_confirm: true`): `admin@caseflow.test` (Alex Morgan, admin) and `viewer@caseflow.test` (Sam Patel, viewer). Passwords come from environment variables. It then upserts their `profiles` rows.
- **Data:** the SQL function `seed_firm(n int default 2500)`:
  - Truncates the firm data, then generates realistic, diverse names, the matter/source/status mix, follow-ups spread relative to `current_date` (about 2% overdue, about 1% due today), notes, and activities with the seeded admin as actor.
  - Deterministic (`setseed`), which keeps tests stable.
  - It sets `set_config('caseflow.seeding','on', true)`, and the activity triggers skip whenever that flag is on, so there are no duplicate "created" entries.
- **Where it runs:** locally through `supabase db reset` plus `pnpm seed`; in CI before integration and e2e tests; in production through the manually triggered `seed` workflow.

**Follow-up validation rule**
- "Not in the past" applies **only when the follow-up date is set or changed**, compared with the stored value. Overdue contacts can still be edited, moved, deleted, restored and undone without being rescheduled first.

**Urgency rules**
- Only `lead` and `active` contacts can be overdue or due today. A closed contact's follow-up is shown muted and never flagged.
- "Overdue": `follow_up_on < today_tz`. "Due today": `follow_up_on = today_tz`. "Next 7 days": `today_tz <= follow_up_on < today_tz + 7`.

## 7. Backend contracts (frozen in milestone M0; every workstream builds against them)

All types live in `lib/contracts/`. The Zod schemas are the single source of truth, and TS types are inferred from them.

### 7.1 Sign-in and sign-out (Server Actions)
- **`signIn(input)`:**
  - Validated with `SignInSchema` (email: trim, lowercase, `z.email()`; password: required).
  - Calls `signInWithPassword` with a secret-key client that sends the `Sb-Forwarded-For: <client ip>` header, then sets the session cookies (httpOnly, Secure, SameSite=Lax) and the `tz` cookie (passed from a hidden field).
  - **Results:** `ok` redirects to `next` or `/contacts`. Errors: `invalid_credentials` (the same message whichever field was wrong), `rate_limited` (from Supabase 429, with `retryAfter` when available), `server`.
- **`signOut()`:** clears the session and redirects to `/login`.
- **Not supported:** sign-up, password reset, magic links.

### 7.2 RPC `search_contacts(filters jsonb, sort text, dir text, page int, page_size int, tz text)`
- **Returns** `{ rows: ContactRow[], total: number, matching: number }`.
- `ContactRow` contains: id, full_name, email, phone, matter_type, referral_source, status, follow_up_on, created_at, updated_at, and the computed values `urgency: 'overdue'|'today'|'later'|'none'` and `days_overdue int|null`.
- **Allowed sorts:** `follow_up` (urgency order, the default), `name`, `waiting` (created_at), `updated`, `status`.

### 7.3 RPC `contact_facets(filters jsonb, tz text)`
Returns:
```ts
{ total: number; matching: number;
  quickViews: { all: number; overdue: number; dueToday: number };
  facets: { status: Record<Status, number>; matterType: Record<MatterType, number>;
            referralSource: Record<ReferralSource, number>;
            followUp: Record<'overdue'|'dueToday'|'next7Days'|'none', number> } }
```
- Each facet group's counts apply **every other filter except that group's own**.
- It is a single pass over the rows using `count(*) filter (where …)`.

### 7.4 Filters shape (`FiltersSchema`, shared by the URL, the RPCs and the UI)
- `q?: string` (at most 100 characters)
- `status?: Status[]`, `matterType?: MatterType[]`, `referralSource?: ReferralSource[]`
- `followUp?: 'overdue'|'dueToday'|'next7Days'|'none'|'custom'`, with `followUpFrom?` and `followUpTo?` (a flat range, used only with `'custom'`)
- `createdFrom?`, `createdTo?` (ISO dates)
- Dates are real calendar dates in `YYYY-MM-DD` form (`2026-02-31` is rejected). `from` may equal `to` but not follow it.
- `followUpFrom`/`followUpTo` are rejected unless `followUp` is `'custom'`, and `'custom'` needs at least one of them.
- In the URL, an invalid combination falls back instead of erroring: the offending dates (or a `'custom'` with no valid bound) are dropped.

Quick views are presets that write `followUp`. The pipeline uses the same filters with `status` ignored, plus a per-column `RPC search_contacts` call with the status fixed, `page_size` 50 and offset paging ("Show 50 more").

### 7.5 Server Actions (each returns `Result<T> = {ok:true,data:T} | {ok:false,error:{code,message,fieldErrors?}}`; codes include `forbidden`, `unauthorized`, `conflict`, `validation`, `not_found`, `server`)
- `createContact(input)` and `updateContact(id, input, expectedUpdatedAt)`.
  - `updateContact` uses **optimistic concurrency**: it returns `conflict` if the row changed since the form opened. The firm workspace is shared, and reviewers are signed in as the same admin.
- `moveContact(id, toStatus)` returns the updated row.
- `deleteContact(id)` (soft) and `restoreContact(id)`, which backs Undo.
- `addNote(contactId, body)`.

Each one calls `requirePermission(...)` first (contacts.write, contacts.delete or notes.write; Postgres enforces the same rules again), re-validates with the same Zod schema, check the follow-up date against the user's time zone, and call `revalidatePath` on the affected routes.

### 7.6 Contact read for the detail page
`getContact(id)` returns the contact, its notes (newest first, with the author's display name and role) and its activities (newest first, limit 100, with the actor's name). A missing or soft-deleted contact gives `notFound()`.

### 7.7 RBAC enforcement (four layers; only Postgres is trusted)
1. **`proxy.ts`: logged in or not, nothing more.** It refreshes the session and redirects anyone without one to `/login?next=…`. It isn't relied on for authorization, because Next's docs warn against it and CVE-2025-29927 showed a middleware bypass.
2. **Server: `getViewer()`** takes the verified user from `supabase.auth.getClaims()` (which checks the JWT signature) and adds their profile and permissions. It's wrapped in React `cache()`, so it runs once per request. `requirePermission(p)`:
   - in a **page**, renders the forbidden screen (§8.10)
   - in an **action**, returns `{ok:false, error:{code:'forbidden'}}`
3. **Postgres RLS plus triggers** (§6). Every query carries the user's JWT, which Supabase verifies. **Even someone calling the Supabase API directly with a Viewer token can't write anything.**
4. **Client:** the root layout, rendered on the server, passes `permissions` into a `PermissionsProvider`. Components use `usePermission(p)` / `<Can p>` to disable or hide controls. There's **no `/me` request** and no flash of the wrong UI.

**Why the role is read from `profiles` rather than a JWT claim:** a role change takes effect immediately, and nothing needs configuring in the dashboard. The custom access token hook is a scaling option, listed in the README.

## 8. Frontend specification (the core of the assessment)

### 8.1 Routes

| Route | Screen |
|---|---|
| `/login` | Email and password form (no sign-up) |
| `/contacts` | The list (default) |
| `/contacts/new` | Create form |
| `/contacts/[id]` | Detail |
| `/contacts/[id]/edit` | Edit form |
| `/pipeline` | The board |

- `/` redirects to `/contacts`.
- `proxy.ts` sends anyone without a session to `/login?next=…`, and adds `reason=expired` when a session cookie existed but has died.

### 8.2 App shell
- **Desktop (≥ 1024px):** a left sidebar 196px wide with the Caseflow mark, Contacts and Pipeline (`aria-current`), and an account block at the bottom: display name, a **role badge** ("Admin", or "Viewer · read-only" with a lock icon) and Sign out.
- **Tablet (768–1023px):** the sidebar collapses to an icon rail with tooltips.
- **Mobile (< 768px):** a top bar (mark plus a primary "New" button) and a **sticky bottom tab bar** (Contacts, Pipeline, Account), respecting the safe-area inset.
- **Accessibility:** a skip link ("Skip to content"); landmarks (`nav`, `main`, `aside`); and route changes are announced by **Next.js's built-in route announcer**, so we add no second announcer and screen readers don't hear each navigation twice. Every page sets a distinct `<title>`.

### 8.3 Contacts list (`/contacts`)
- **Header:** "Contacts" and "**1,284 of 2,437**" (matching of total), and the primary "New contact" button.
- **Toolbar:**
  - Search, debounced 250ms, with a pending spinner inside the field while the transition runs. Esc clears it.
  - The Filters button, with a badge for the number of applied filter groups and `aria-expanded`.
  - Quick views as a segmented control (All · Overdue N · Due today N).
  - Applied filters as chips ("Status: Lead, Active ✕"). Each ✕ is a 24px button labelled "Remove Status filter".
- **Table:**
  - **Columns:** Name (a link to the detail page), Matter, Status pill, Follow-up (urgency pill, sorted ascending by default), Phone, Email (truncated with a title attribute), Source, Waiting (days since created).
  - **Sortable headers** are buttons with `aria-sort`.
  - Rows are 36px and use tabular numerals. The header is sticky.
  - Rendering uses **TanStack Table in manual mode with TanStack Virtual,** keeping table semantics with `aria-rowcount` (matching) and `aria-rowindex`.
  - The page size selector offers 25/50/100/250/500 (default 250).
  - The pager includes first/last pages and an ellipsis. Changing the page scrolls to the top and focuses the table caption.
- **Narrow viewports:**
  - 1024–1279px: the table scrolls horizontally with the Name column pinned.
  - Below 768px: the table becomes a **card list** (name plus follow-up pill on line 1; matter, status and a `tel:` phone link on line 2), and a **Sort** button opens a menu with the same sort options.
- **Filters panel:** see decision 11.
  - **Desktop:** fixed under the toolbar, full height, with its own scroll, a sticky header (title · count, Clear all, ✕) and a sticky footer (Cancel, Apply). It is non-modal.
  - **Mobile:** a Radix Dialog sheet from the right, with focus trapped, and closing on the scrim, Esc or ✕. Focus returns to the Filters button.
  - **Groups:** Status, Follow-up (Any, Overdue, Due today, Next 7 days, No follow-up, Custom range), Matter type, Referral source, Created date (range).
  - Facet counts are shown next to each option.
  - **Open state:** the panel starts closed, and its open state is remembered in a cookie.
- **All filter, sort and paging state lives in the URL,** so it can be shared and survives the back button and a refresh. Invalid parameters fall back to the defaults without an error.

### 8.4 Contact detail (`/contacts/[id]`)
- **Breadcrumb:** "Contacts / Name". Back returns to the list with its filters intact, because they're in the URL.
- **Header:** name, status pill, matter, "Enquired Nov 12 · waiting 4d". Actions: **Move to…** (a menu listing the other two statuses), **Edit**, and an overflow menu (Delete).
- **Left column:**
  - The Follow-up card first: an urgency pill and the date, with a **Reschedule** button opening a date popover that saves straight away.
  - The Details list (phone as a `tel:` link, email as a `mailto:` link, matter type, source, summary at 68ch).
  - **Notes:** a composer (textarea, at most 2,000 characters with a counter near the limit, Save disabled while empty or pending, Cmd/Ctrl+Enter submits) above a list of notes, newest first.
- **Right column:** the **activity timeline**, with entries such as "Status changed Lead → Active" and "Follow-up set to Sat, Nov 14". Each timestamp is a `<time>` element with the full date in a tooltip.
- **Mobile:** a single column with a large **Call** button.
- **Not found:** if the id is unknown or the contact was deleted, a page reads "This contact doesn't exist or was deleted." with a link back to Contacts.

### 8.5 Create and edit forms (`/contacts/new`, `/contacts/[id]/edit`)
- A full page with fieldsets: Person (name, then email and phone), Matter (type, source, summary with a counter), and Intake (status segmented control, next follow-up date picker with "Today or later.").
- **Validation:**
  - Fields validate on blur after the first interaction. Submitting validates everything.
  - An **error summary** (`role="alert"`) lists links to each invalid field, and focus moves to the first one.
  - Each message is tied to its field with `aria-describedby`, and invalid fields get `aria-invalid`.
  - **Cross-field rule:** "Add an email or a phone number." is shown on the email/phone pair.
- **Saving:**
  - The Save button shows a pending label and can't be pressed twice.
  - The server repeats the same validation and returns field errors, which are mapped back onto the fields.
  - **If the save fails, everything the user typed stays in the form,** with a retryable error.
  - An **edit conflict** shows "This contact was changed since you opened it." with "Reload latest" and "Overwrite" buttons.
- **Unsaved changes:** a `beforeunload` guard while the form is dirty, and Cancel asks for confirmation when dirty.
- After saving, the user goes to the detail page and a toast says "Contact saved".

### 8.6 Pipeline (`/pipeline`)
- **Desktop:** three columns (Lead, Active, Closed), each with its count, urgency-ordered cards, and **Show 50 more · N left** at the bottom. The header carries the same search and Filters panel, with the Status group hidden because the columns already split by status.
- **Cards:** name (a link to the detail page), urgency pill, "matter · phone", and a **Move to…** menu (Radix DropdownMenu, fully keyboard accessible).
- **Moving a card:**
  - The card moves optimistically with `useOptimistic`, and the column counts update.
  - A toast says "Marisol Ortega moved to Active · Undo" (about 6s). Undo moves it back.
  - **On failure** the card returns to its column and an error toast offers Retry.
- **Mobile:** tabs for each status with counts, showing one column at a time.

### 8.7 Dates and time zones
- **Storage:** follow-ups are a SQL `date`. Moving them between the browser and the server always uses `'YYYY-MM-DD'` strings, formatted with date-fns `format` and **never `toISOString()`**.
- **The `tz` cookie:**
  - It's set at login from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
  - On the client, `TimezoneSync` compares that value with the cookie on every load. If they differ, it updates the cookie and calls `router.refresh()`.
  - The server validates the cookie with a try/catch around `new Intl.DateTimeFormat('en', {timeZone})`. `Intl.supportedValuesOf` is **not** used, because it leaves out aliases such as `Asia/Calcutta` and `UTC`. The RPCs also guard the value against `pg_timezone_names`. Anything invalid falls back to UTC.
- **Where it's used:** the RPCs and the "not in the past" check in Server Actions both compute "today" in that time zone.
- **Refresh on focus:** data refreshes when the window regains focus, so labels update after midnight.
- **Display:** relative labels ("Overdue · 2d", "Today") and absolute dates ("Fri, Nov 20", with the year only when it isn't the current year), all in the user's locale.

### 8.8 States matrix (every screen)

| Screen | Loading | Empty | Error |
|---|---|---|---|
| Contacts | Route `loading.tsx` with table-shaped skeleton rows. While filters change, the old rows dim (`aria-busy`) and nothing jumps. | First-run (no contacts at all): "No contacts yet." with New contact. Filtered: "No contacts match these filters." listing the active filters, with Clear filters. | `error.tsx`: "Contacts didn't load." plus the reason class, a Retry button (`startTransition(() => { router.refresh(); reset() })`, or the retry API the pinned Next 16 docs recommend, because `reset()` alone doesn't re-fetch server data), and "Your filters are kept." |
| Detail | Skeletons shaped like the header, panels and timeline | No notes: "No notes yet." with focus moved to the composer. No activity beyond creation is still shown. | Error boundary with Retry. Not found is handled separately (§8.4). |
| Form | A skeleton for edit while the contact loads. Pending state on submit. | n/a | Inline field errors, the summary, a save-failed banner (input kept), the conflict banner |
| Pipeline | Three skeleton columns | Per column: "No Lead contacts." Filtered: same pattern as the list. | Error boundary with Retry. A failed move rolls back with a toast. |
| Login | Pending button ("Signing in…") | n/a | Field errors ("Enter a valid email address.", "Enter your password."), wrong credentials ("Email or password is incorrect.", never saying which), rate limited ("Too many attempts. Try again in N minutes."), server error with retry. All announced through `aria-live`. Mockup: `design/mockups/login-rbac-v1.html`. |
| Session expired | n/a | n/a | `/login?reason=expired`: "Your session ended. Sign in to pick up where you left off." |
| Forbidden (Viewer on a write URL) | n/a | n/a | "You can't edit contacts. Your role is Viewer, which is read-only…" with a link back to the contact. Rendered on the server. |

**No demo or simulation controls.** The app is presented as fully functional. Loading, empty and error states are reached naturally (network conditions, filters, failures), and are covered by component and e2e tests.

### 8.9 Edge cases catalogue (each needs a test or a manual check during the audit)
- Names with accents or apostrophes, very long names (truncated with the full name in a tooltip), emoji. Leading and trailing whitespace is trimmed, and a name that is only whitespace is invalid.
- A phone number typed in any format; searching "5550148" matches "(512) 555-0148" through `phone_digits`.
- A follow-up today at 11:59pm local time is still "Today". A user east of UTC+12 doesn't see wrong overdue labels.
- Closed contacts are never flagged overdue. Moving a contact to Closed keeps its follow-up date but mutes it.
- Double-clicking Save, Move or Apply runs once.
- A stale or invalid URL (`?page=999`, `?status=foo`) clamps to the last page or ignores the bad value.
- Deleting a contact while on its detail page goes back to the list, with a toast offering Undo.
- Two reviewers signed in as the admin and editing the same contact triggers the conflict banner. For a move, the last write wins.
- A role or permission that changes mid-session: the next server action returns `forbidden`, the optimistic change is rolled back, and a toast says what wasn't allowed. The next navigation re-renders with the new permissions.
- A Viewer opening `/contacts/new`, `/contacts/[id]/edit`, or calling an action directly gets the forbidden page or a `forbidden` result, and the database rejects it as well.
- An edit conflict, then Reload, restores the form from the server values.
- Network loss during a save: the user's input is kept and a retry is offered.
- Session expiry mid-action: the Server Action returns `unauthorized`, and the client redirects to login with `reason=expired` and `next`. On the free plan, refresh tokens don't expire, so this only happens in practice when a user is deleted or a cookie is tampered with. The e2e test simulates it by corrupting the cookie.
- The 500-row page size still scrolls at 60fps (virtualized). No layout shift from fonts: `next/font`'s size-adjusted fallback handles it, and rows aren't held back waiting for fonts.
- Zoom to 200% and a 320px-wide viewport still work.
- `prefers-reduced-motion` and `forced-colors` mode (pills keep borders) are both respected.

### 8.10 RBAC in the UI (mockup: `design/mockups/login-rbac-v1.html`)
- **The role is always visible:** a badge in the sidebar account block, and on mobile under the Account tab.
- **In-context write actions are visible but disabled, with the reason.** This covers Edit, Move to…, Delete, the pipeline card menus and Reschedule. They use `aria-disabled="true"` (so they stay focusable) and show a tooltip on hover or focus: "Viewers can't edit contacts. Ask an admin."
- **Entry points that would only lead to a forbidden page are hidden:** the "New contact" buttons and the mobile "New" button. The empty state's "New contact" call to action is replaced with "No contacts yet. An admin can add them."
- **The notes composer is replaced** for Viewers with "Viewers can read notes but can't add them."
- **The forbidden page** (`app/forbidden.tsx`, or the pinned Next 16 equivalent, otherwise a shared component) is rendered when `requirePermission` fails on a page.
- **A server `forbidden` result** gives a toast naming the action ("You don't have permission to move contacts.") and rolls back any optimistic change.
- **Search, filters, sort, pagination and quick views are fully available to Viewers.**

### 8.11 Accessibility (WCAG 2.2 AA)
- **Contrast:** body and secondary text at least 4.5:1 (secondary `#56645E`). Visible focus everywhere (a 3px sage ring). Targets of 24px or more (WCAG 2.5.8).
- **Not colour alone:** urgency and status are always written as text.
- **Moving without dragging:** a menu alternative for every move (2.5.7).
- **Screen readers and keyboard:** live regions for search results ("1,284 contacts"), toasts and form errors. Radix components handle focus management. Every component works with the keyboard alone.
- **Automated checks:** axe runs in e2e on every route. A manual VoiceOver pass happens during the audit.

### 8.12 Performance budget
- **Lighthouse:** Performance at least 90 and Accessibility at least 95 on `/contacts` (mobile preset).
- **Layout shift:** CLS below 0.05. `next/font` with Figtree is self-hosted and subset.
- **JavaScript:** route JS for `/contacts` under 180kB gzipped. Icons are imported per icon.
- **Rendering:** RSC streaming with Suspense around the data regions. Virtualized rows.
- **Server:** the RPCs return in under 50ms at about 2.5k rows (the indexes make this possible).
- **Lighthouse CI:** runs against production as a non-blocking check in the stretch milestone.

### 8.13 Design system (tokens become `DESIGN.md` and `app/globals.css` in M0)
- **Type:** Figtree (400/500/600/700). Scale 12/13/14/16/20/24, product ratio about 1.15. Tabular numerals for data.
- **Light theme:**
  - Surfaces: canvas `#F4F6F3`, surface `#FFFFFF`, panel `#FAFBF9`
  - Lines: line `#E3E8E2`, line-soft `#EEF1ED`
  - Text: ink `#1E2A26`, ink-2 `#56645E`
  - Accent `#1F5C4A`, accent-soft `#E6F0EB`
  - Urgency: overdue `#9E3426` on `#FCE8E4`, today `#7A4B00` on `#FFF1D6`
  - Status pills: Lead outline `#C3CEC8`, Active `accent-soft`, Closed `#ECEFED`
- **Dark theme: a nice-to-have, not in the first iteration.** v1 ships **light only**. All colours are CSS variables from day one, and no component uses a literal colour, so dark mode is just a second token set plus a theme switch (stretch milestone S1). Proposed values: canvas `#0F1513`, surface `#161D1A`, panel `#131A17`, line `#27312D`, ink `#E4EBE7`, ink-2 `#A3B3AB`, accent `#6FC3A0`, overdue `#FFB4A6` on `#3A1D18`, today `#F5C46B` on `#3A2A0E`. Every pair is re-checked for 4.5:1 contrast. Theme choice (system, light, dark) is stored in a cookie so there's no flash.
- **Radii:** 6 (controls), 10 (surfaces), 999 (pills). **Shadows:** only on floating layers (menus, panel, toast). **Spacing:** a 4px base.
- **States per component:** default, hover, focus-visible, active, disabled, loading, error, all built in M2 and shown in the dev gallery at `/dev/components` (guarded so it isn't reachable in production).
- **Browser surfaces:** `::selection`, caret colour, scrollbars, focus rings and underline offset are all themed from the tokens.

## 9. Testing (critical paths only, test-first)
- **Unit (Vitest):**
  - `ContactSchema` (email-or-phone, follow-up not in the past for a given time zone **only when it changed**, trimming)
  - `FiltersSchema` and the URL parsers (invalid values fall back)
  - `SignInSchema`; the mapping from permissions to UI state (`usePermission`)
  - Date helpers (`toDateOnly` never shifts the date, `todayIn(tz)` across UTC+14 and UTC−11)
  - Urgency labels
- **Component (Vitest + Testing Library):**
  - The filters panel (Apply applies and closes; Cancel discards; Clear all resets the draft)
  - Form error summary and focus
  - The Move to… menu with keyboard
- **Integration (Vitest against local Supabase):**
  - **RBAC policies:** a Viewer can't insert, update, soft-delete or add notes, even through the Supabase API directly; an Admin can do all of it. `has_permission` matches the seeded matrix.
  - The seed is idempotent (running it twice gives the same row counts and accounts)
  - The activity triggers
  - **Facets match `search_contacts` totals** for a set of filter combinations
  - Time-zone "today" differs between two zones
  - `signIn` results: ok, wrong credentials, and a mocked Supabase 429 mapping to `rate_limited`
  - Edit conflict detection
- **E2E (Playwright, local Supabase, `--trace off`):**
  - Login: field errors, wrong credentials, then success as Admin
  - **Viewer:** write controls disabled with reasons, the composer replaced, `/contacts/[id]/edit` shows the forbidden page
  - List search, filters, sort and pagination, then a reload keeps the state
  - Create with validation errors, then success, then edit
  - Detail: add a note and see it in the timeline
  - Pipeline: move, Undo, reload
  - Mobile viewport smoke test for the list, the filters sheet and the tab bar
  - **axe on every route**

## 10. CI/CD (GitHub Actions)
- **On a pull request:**
  - `checks`: format, lint (with `jsx-a11y`), typecheck, unit tests, build
  - `integration-e2e`: `supabase start`, then `supabase db reset` and `pnpm seed`, integration tests, then a production build with Playwright and axe
  - `gitleaks`
  - **No preview deploys** (a known gap; a staging project is future work).
- **On push to `main`:** checks, then `supabase db push`, then `vercel deploy --prebuilt --prod`, then a production smoke test (Playwright: sign in as the Viewer and check the contacts list renders; read-only, so production data isn't touched).
- **Manual (`workflow_dispatch`):** `seed`, which runs the idempotent account and data seed against production.
- **Scheduled:** a daily keep-alive query (prevents the Supabase pause).
- **Stretch:** Lighthouse CI against production after deploy, non-blocking.
- **Repo hygiene:**
  - The repo is **private during development and made public at submission**. Branch protection (required checks, PRs only) is switched on then, because GitHub Free only enforces it on public repos. During development the PR-plus-CI flow is followed by convention.
  - **PRs merge with merge commits, so the TDD history survives.** Commits are imperative and small, with red then green.
  - Dependabot, a PR template, `.nvmrc`, `CODEOWNERS`.
- **Secrets in GitHub:** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- **Vercel environment variables:** the Supabase URL, publishable key and secret key.
- **GitHub secrets for the `seed` workflow:** `SEED_ADMIN_PASSWORD`, `SEED_VIEWER_PASSWORD`, the Supabase URL and secret key.

## 11. Parallel workstreams

Contracts are frozen in **M0**. After that, three tracks run in parallel, each in its own git worktree and branch, merged through PRs.

- **Track FE:** the design system, then the screens. It uses **fixture data** shaped by `lib/contracts` (`lib/data/fixtures.ts`), so screens can be built before the backend exists. M4 swaps the fixtures for the real `lib/data` calls behind the same function signatures.
- **Track BE:** migrations, RBAC tables and RLS, triggers, the seed, the RPCs, `getViewer`/`requirePermission`, sign-in and the Server Actions, all against a local Supabase.
- **Track OPS:** the CI workflows, the Vercel and Supabase projects, secrets, the deploy pipeline and the keep-alive job.

```
M0 Foundations+contracts ─┬─► FE: M2 design system ─► M3a list · M3b detail+notes · M3c forms · M3d pipeline (parallel)
                          ├─► BE: M1a schema/RBAC/RLS/triggers/seed ─► M1b RPCs ─► M1c auth+RBAC+actions
                          └─► OPS: M5a CI ─► M5b deploy pipeline (needs projects + secrets from Khubaib)
                                         all ─► M4 integration ─► M6 hardening/audit ─► M7 README+submit
```

## 12. Roadmap (deliverables and ETA)

ETAs are focused agent hours. "Wall" is elapsed time with the tracks running in parallel.

| Milestone | Deliverables | Effort | Depends on |
|---|---|---|---|
| **M0 Foundations and contracts** | Repo, scaffold, tooling (pnpm, TS strict, ESLint with `jsx-a11y`, Prettier, Vitest, Playwright), `AGENTS.md`/`CLAUDE.md`, `docs/` (spec, decisions, ADRs), `DESIGN.md` and tokens, `lib/contracts` (all Zod schemas and types), fixtures, the Supabase CLI project, `.env.example` | 1.5h | Spec approval |
| **M1a BE schema and RBAC** | Migrations: enums, RBAC tables, `has_permission`, contacts/notes/activities, indexes, RLS, triggers (`updated_at`/`updated_by`, activities, delete guard), `seed_firm` and `scripts/seed.ts`. Integration tests for the RBAC policies, the seed and the triggers. | 2.25h | M0 |
| **M1b BE queries** | `search_contacts`, `contact_facets` and the shared predicate, plus the time-zone logic. Integration tests checking facets against totals and the time zone. | 1.5h | M1a |
| **M1c BE auth, RBAC and actions** | `signIn`/`signOut` (with `Sb-Forwarded-For`), `proxy.ts`, `getViewer`/`requirePermission`, `PermissionsProvider`, Server Actions with permission checks and conflict detection. Tests. | 1.5h | M1a |
| **M2 FE design system** | Tokens in CSS, primitives (Button, Input, Select, Textarea, Checkbox, Radio, Segmented, Dialog, Sheet, Popover, DropdownMenu, Chip, Pill, Skeleton, EmptyState, ErrorState, Toast, DatePicker), the app shell (sidebar, rail, tab bar), the dev gallery | 2h | M0 |
| **M3a FE list** | The contacts list: table, virtualization, sort, pagination, search, chips, quick views, filters panel and sheet, card list on mobile, all states | 3h | M2 |
| **M3b FE detail** | Detail page, notes composer, timeline, Reschedule, delete with Undo, not-found | 1.5h | M2 |
| **M3c FE forms, login, RBAC states** | Create and edit, validation UX, error summary, conflict banner, unsaved-changes guard; the login page and all its states; the role badge, `<Can>`, disabled-with-reason controls, the forbidden page | 2h | M2 |
| **M3d FE pipeline** | Board, Move to… menu, optimistic move with Undo, per-column paging, mobile tabs | 1.5h | M2 |
| **M5a OPS CI** | `ci.yml` (checks, integration and e2e with Supabase in Docker, gitleaks), Dependabot, PR template, branch protection | 1h | M0 |
| **M5b OPS deploy** | `deploy.yml` (migrate, deploy, smoke test), the `seed` workflow, keep-alive cron, Vercel and Supabase configuration | 1h | M5a + Khubaib's accounts |
| **M4 Integration** | Swap fixtures for real data, e2e suite green, first production deploy | 1.5h | M1b, M1c, M3*, M5b |
| **M6 Hardening** | The edge-case pass, Impeccable `polish` on each screen then `audit`, a manual VoiceOver pass, mobile at 320px, the performance budget | 1.5h | M4 |
| **M7 Docs and submit** | README (one page), final review, a submission checklist (live link, repo access, history) | 0.75h | M6 |
| *Stretch S1* | Dark mode, Lighthouse CI | 1h | M6 |
| *Stretch S2* | A third role (Attorney: close/reopen only), PR previews against a staging project | 1.5h | M7 |

**Totals:** about 21.5h of effort, but **about 11–12h of elapsed time** with the three tracks in parallel (critical path: M0, M2, M3a, M4, M6, M7). That leaves buffer within 24h for review rounds and the stretch milestones.

**Needed from Khubaib, by M5b:**
- A Supabase project (URL, publishable and secret keys, project ref, DB password, access token), with **sign-ups disabled** and **IP forwarding enabled** for auth rate limits.
- Demo passwords for the two accounts.
- A Vercel account and token.
- Confirmation before creating the private GitHub repo.
- Starting Docker Desktop.

## 13. README outline (at most one page)
1. **Live link** and the **demo accounts** (Admin and Viewer, with credentials) and what each can do.
2. **Component structure and state management:** the layers; RSC reads and Server Actions writes; URL state with nuqs; `useOptimistic`; the shared Zod contracts.
3. **UI/UX decisions:**
   - Urgency first, and warm colours only for urgency
   - Density
   - The filters panel and the Apply step
   - Moving cards with a menu rather than drag and drop, for accessibility
   - The state matrix
4. **Trade-offs:**
   - Virtualization versus Ctrl+F
   - Menu versus drag and drop
   - CSS-only motion
   - Shared firm data and no in-app reset
   - Two roles only
   - The Supabase pause and the keep-alive job
   - No PR previews (no staging project)
   - The role read from `profiles` rather than a JWT claim
   - The floating panel covering columns
   - Facet counts based on applied filters only
5. **With more time:**
   - More roles (Attorney, Coordinator), the JWT role claim at scale
   - Sign-up and invites, password reset, MFA and SSO, a firm-wide time zone
   - A staging project with PR previews; a nightly demo reset
   - Global search and keyboard shortcuts
   - Drag and drop
   - Live draft counts
   - Keyset pagination at scale
   - Editing notes
6. **How AI was used:** spec-first interview, ADRs, TDD, subagent tracks in parallel worktrees, Impeccable critique and audit, human decisions at every fork.
7. **Operator note:** to restore the demo accounts or data, run the `seed` workflow (it's idempotent).

## 14. Left to the builder
- Exact copy for the seed data generator, and the distribution numbers within the ranges in §6.
- The internal structure of components, hooks and file names within the layering rules.
- Skeleton shapes, the exact spacing values on the 4px scale, and icon choices from Lucide.
- How the tablet icon rail is implemented.
- Default ordering among equal-urgency rows beyond "most recently updated".
