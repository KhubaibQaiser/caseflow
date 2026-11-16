# Caseflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy Caseflow, a legal-intake mini CRM (contacts list, detail, forms, pipeline, RBAC). The frontend must be impeccable, the backend Supabase, and CI/CD strong.

**Architecture:** Next.js App Router. Server Components read through `lib/data` (Supabase, user JWT, RLS); Server Actions write (`requirePermission`, then Zod, then Supabase). List and facets come from two Postgres RPCs that share one predicate. RBAC has four layers: proxy (signed in?), server `requirePermission`, Postgres RLS (trusted), and client `usePermission`. Contracts in `lib/contracts` are frozen in M0, so the FE, BE and OPS tracks can run in parallel worktrees.

**Tech Stack:**
- Next.js 16.x (latest via create-next-app), React 19, TypeScript strict, pnpm 10, Node 24.
- UI: Tailwind CSS 4 tokens, Radix primitives, lucide-react, sonner.
- Data and forms: TanStack Table + Virtual, React Hook Form + Zod, nuqs, date-fns, react-day-picker.
- Backend: Supabase (Postgres, Auth, RLS) via `@supabase/ssr`.
- Tests: Vitest + Testing Library, Playwright + `@axe-core/playwright`.
- CI/CD: GitHub Actions + Vercel CLI.

**Spec:** `docs/SPEC.md`. Also `PRODUCT.md`, `docs/DECISIONS.md`, `docs/adr/`, and the mockups in `design/mockups/` (`direction-c-v5.html`, `screens-v1.html`, `login-rbac-v1.html`). Read the spec section each task cites.

## Global Constraints

- No `any` and no `@ts-ignore`. Data is validated with Zod at every trust boundary (form, Server Action, RPC response).
- **No colour literals outside `app/globals.css`.** Use design tokens only (spec §8.13). v1 is **light mode only**, with every colour a CSS variable.
- Layering is `app → features → components → lib → utils`, and nothing imports upward. `lib/data`, `lib/supabase` and `lib/auth/viewer.ts` start with `import 'server-only'`.
- Terminology: "contact", "matter", "follow-up", "Lead / Active / Closed". Never "deal" or "customer". The voice is crisp power-tool (PRODUCT.md).
- Dates move between browser and server only as `'YYYY-MM-DD'` strings. Never use `toISOString()` for date-only values (§8.7).
- Page sizes are `[25, 50, 100, 250, 500]`, default `250`. Pipeline columns load `50` per request.
- The urgency order is overdue → due today → soonest follow-up → no follow-up, with ties broken by `updated_at desc`. Closed dated rows sort after open dated rows. **Only Lead and Active can be overdue or due today.**
- Accessibility: WCAG 2.2 AA. Contrast is at least 4.5:1, targets at least 24px, focus is always visible, nothing relies on colour alone, and there's a menu alternative to dragging.
- Performance: Lighthouse Performance ≥ 90 and Accessibility ≥ 95 on `/contacts` (mobile preset). CLS < 0.05. `/contacts` route JS < 180kB gzipped. Icons are imported one at a time.
- Before writing route, proxy, caching, `forbidden` or error-boundary code, read `node_modules/next/dist/docs/` (Next 16 renamed `middleware` to `proxy`).
- Every commit is small and imperative, with the failing test committed before its implementation. PRs merge with merge commits (no squash). End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Secrets never appear in code, logs, chat or commits. Use `gh secret set` / `vercel env add` from piped values only.

## Review Focus

1. **Long content** (120-character names, long emails, a 1,000-character summary) must truncate with a `title` tooltip in the table, cards and detail header, and must never widen the layout. Test: T14 Step 1.
2. **Typing fast in search, or pressing back and forward through URL states,** must leave the screen showing results for the latest query only. Test: T22 `contacts.spec.ts` "rapid typing shows results for the final query".
3. **Double-clicking Save, Apply, Move or Save note** must send exactly one request. Tests: T17 Step 1, T18 Step 1, T16 Step 1.
4. **A session that dies mid-action** must redirect to `/login?reason=expired&next=…` and keep the form input in the browser history. Test: T22 `auth.spec.ts` "expired session on save redirects with next".
5. **The page falls out of range after filtering** (on page 5, then a filter leaves one page): any change to filters, search, sort or page size resets `page` to 1, and an out-of-range `page` clamps to the last page on the server. Tests: T2 `clampPage`, T14 Step 1.

---

## Tracks and order

```
M0 (sequential): T1 → T2 → T3 → T4
then in parallel worktrees:
  BE:  T5 → T6 → T7 → T8 → T9 → T10
  FE:  T11 → T12 → T12b → T13 → {T14 → T15} ∥ T16 ∥ T17 ∥ T18 ∥ T19
  OPS: T20 → T21
then: T22 (integration and e2e) → T23 (production deploy) → T24 (hardening and audit) → T25 (README and submission)
stretch: S1 dark mode · S2 Attorney role + staging previews
```

The FE track builds against `lib/data/fake.ts` (same signatures as the real data layer) and against actions passed in as props. T22 deletes the fake and wires the real implementations.

## File map

```
app/layout.tsx, app/globals.css, app/page.tsx (redirect /contacts), app/forbidden.tsx (or Next 16 equivalent)
app/(auth)/login/page.tsx
app/(app)/layout.tsx                              # getViewer → PermissionsProvider + shell
app/(app)/contacts/{page,loading,error}.tsx
app/(app)/contacts/new/page.tsx
app/(app)/contacts/[id]/{page,loading,error,not-found}.tsx
app/(app)/contacts/[id]/edit/page.tsx
app/(app)/pipeline/{page,loading,error}.tsx
app/dev/components/page.tsx                       # gallery; notFound() in production
proxy.ts
lib/contracts/{enums,permissions,result,auth,contact,list-query,facets}.ts
lib/dates/{date-only,labels}.ts, lib/dates/server.ts (getRequestTimeZone)
lib/supabase/{server,admin,database.types}.ts
lib/data/{index,supabase,fake,fixtures,mutations}.ts
lib/auth/{viewer.ts,permissions-context.tsx}
features/auth/{actions.ts,login-form.tsx}
features/contacts/{actions.ts,url-state.ts}
features/contacts/list/{toolbar,quick-views,filter-chips,contacts-table,contact-cards,pagination,sort-menu,empty-states}.tsx
features/contacts/filters/{filters-panel.tsx,use-filter-draft.ts}
features/contacts/detail/{contact-header,follow-up-card,details-list,notes,timeline,move-menu}.tsx
features/contacts/form/{contact-form.tsx,conflict-banner.tsx,use-unsaved-guard.ts}
features/pipeline/{board,column,pipeline-card,mobile-tabs}.tsx, features/pipeline/use-board-moves.ts
components/ui/{button,input,textarea,field,checkbox,radio-group,segmented,pill,chip,skeleton,empty-state,error-state,dialog,sheet,popover,dropdown-menu,tooltip,date-picker,toaster}.tsx
components/shell/{sidebar,tab-bar,account-block,page-header,timezone-sync,forbidden-state}.tsx
supabase/config.toml, supabase/migrations/2026111601_rbac.sql … 2026111605_queries.sql
scripts/seed.ts
tests/integration/{setup.ts,rbac.test.ts,triggers.test.ts,seed.test.ts,queries.test.ts,mutations.test.ts}
tests/e2e/{auth,contacts,contact-form,detail,pipeline,viewer,mobile,a11y,smoke}.spec.ts
.github/workflows/{ci,deploy,seed,keep-alive}.yml, .github/{dependabot.yml,pull_request_template.md,CODEOWNERS}
AGENTS.md, CLAUDE.md (@AGENTS.md), DESIGN.md, README.md
vitest.config.mts (projects: unit = jsdom, integration = node), playwright.config.ts
```

---

## M0: Foundations and contracts (sequential)

### Task 1: Scaffold, tooling and first commits

**Files:**
- Create: everything `create-next-app` generates, plus `.nvmrc` (`24`), `.env.example`, `vitest.config.mts`, `playwright.config.ts`, `AGENTS.md`, `CLAUDE.md`, `.prettierrc`.
- Modify: `package.json` scripts, `.gitignore`.

**Interfaces:**
- Produces these scripts: `dev`, `build`, `start`, `typecheck` (`tsc --noEmit`), `lint` (`eslint . && node scripts/check-no-color-literals.mjs`), `test` (`vitest run --project unit`), `test:integration` (`vitest run --project integration`), `e2e` (`playwright test --trace off`), `format`, `format:check`, `seed` (`tsx scripts/seed.ts`), `db:types` (`supabase gen types typescript --local > lib/supabase/database.types.ts`).

- [ ] **Step 1: Commit the existing docs first.** `git add docs PRODUCT.md design .gitignore && git commit -m "Add brief, spec, ADRs, product brief and approved mockups"`.
- [ ] **Step 2: Scaffold.** `pnpm create next-app@latest . --ts --eslint --tailwind --app --no-src-dir --import-alias "@/*" --use-pnpm`. Keep the existing files. Set `"engines": {"node": "24.x"}` and `packageManager` to the pinned pnpm version.
- [ ] **Step 3: Install dev tooling.** Vitest, `@vitejs/plugin-react`, `vite-tsconfig-paths`, jsdom, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@playwright/test`, `@axe-core/playwright`, Prettier with `prettier-plugin-tailwindcss`, `eslint-plugin-jsx-a11y`, `eslint-config-prettier`, `tsx`, `server-only`. Pin exact versions.
- [ ] **Step 4: Configure.**
  - `tsconfig.json`: `"strict": true` and `"noUncheckedIndexedAccess": true`.
  - ESLint: add `jsx-a11y/recommended` and `@typescript-eslint/no-explicit-any: error`.
  - Vitest: two `projects`. **unit** uses jsdom and matches `**/*.test.{ts,tsx}`, excluding `tests/integration`. **integration** uses node and matches `tests/integration/**`.
  - Playwright: `webServer` runs `pnpm build && pnpm start`, `baseURL` is `http://localhost:3000`, and there are two projects: `desktop` (1440×900) and `mobile` (`devices['iPhone 13']`, `grep: /@mobile/`).
- [ ] **Step 5: Write `scripts/check-no-color-literals.mjs`.** It fails if any `.ts`, `.tsx` or `.css` file outside `app/globals.css` contains `#[0-9a-fA-F]{3,8}\b`, `rgb(` or `hsl(`.
- [ ] **Step 6: Write `AGENTS.md`.** Cover:
  - Roles: Khubaib decides, the agent proposes.
  - Read `docs/SPEC.md`, `docs/PLAN.md` and `docs/adr/README.md` before each task.
  - The Global Constraints above.
  - The commands.
  - The ADR rule: only Khubaib flips `proposed` to `accepted`.
  - `CLAUDE.md` contains `@AGENTS.md`.
- [ ] **Step 7: Write a placeholder unit test** `utils/smoke.test.ts` that asserts `1 + 1 === 2`, so the runner is proven.
- [ ] **Step 8: Verify.** Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. Expected: all pass.
- [ ] **Step 9: Commit.** `git commit -m "Scaffold Next.js app with strict TypeScript, lint, Vitest and Playwright"`. Then push `main` (`git push -u origin main`).

### Task 2: Contracts (frozen after this task)

**Files:**
- Create: `lib/contracts/{enums,permissions,result,auth,contact,list-query,facets}.ts`
- Test: `lib/contracts/contact.test.ts`, `lib/contracts/list-query.test.ts`

**Interfaces (produces; every later task consumes):**
- **`enums.ts`:**
  - `STATUSES = ['lead','active','closed'] as const`; `type Status`
  - `MATTER_TYPES = ['personal_injury','family','immigration','employment','estate_planning','criminal_defense'] as const`
  - `REFERRAL_SOURCES = ['google_search','past_client','attorney_referral','bar_referral','website_form'] as const`
  - The labels `STATUS_LABEL`, `MATTER_TYPE_LABEL` and `REFERRAL_SOURCE_LABEL` (for example `personal_injury → 'Personal injury'`, `google_search → 'Google search'`)
  - `FOLLOW_UP_FILTERS = ['overdue','dueToday','next7Days','none'] as const`
- **`permissions.ts`:**
  - `ROLES = ['admin','viewer'] as const`
  - `PERMISSIONS = ['contacts.read','contacts.write','contacts.delete','notes.write'] as const`
  - `ROLE_PERMISSIONS: Record<Role, readonly Permission[]>`, where admin has all four and viewer has `contacts.read`
  - `ROLE_LABEL = {admin:'Admin', viewer:'Viewer'}`
  - `type Viewer = {id:string; email:string; displayName:string; role:Role; permissions: Permission[]}`. It lives here so the FE track can use it before T9 exists.
- **`result.ts`:**
  - `type ErrorCode = 'validation'|'forbidden'|'unauthorized'|'conflict'|'not_found'|'invalid_credentials'|'rate_limited'|'server'`
  - `type Result<T> = {ok:true; data:T} | {ok:false; error:{code:ErrorCode; message:string; fieldErrors?:Record<string,string>; retryAfter?:number}}`
  - `ok<T>(data:T)` and `fail(code, message, extra?)`
- **`auth.ts`:** `SignInSchema = z.object({email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.')), password: z.string().min(1,'Enter your password.')})`
- **`contact.ts`:**
  - `makeContactInputSchema(opts:{today:string; previousFollowUpOn?:string|null})`. Fields:
    - `fullName` (trim, 2–120)
    - `email` (empty becomes null, otherwise `z.email`)
    - `phone` (empty becomes null, otherwise at least 7 digits once non-digits are stripped, and at most 20 characters)
    - `matterType` (enum)
    - `referralSource` (enum or null)
    - `status` (enum, default `'lead'`)
    - `followUpOn` (`YYYY-MM-DD` or null; **must be ≥ `today` only when it differs from `previousFollowUpOn`**)
    - `summary` (trim, ≤ 1000, empty becomes null)
  - A `superRefine` adds the issue "Add an email or a phone number." on the path `['contactMethod']` when both email and phone are null.
  - `type ContactInput`
  - `ContactRowSchema` and `type ContactRow = {id; fullName; email; phone; matterType; referralSource; status; followUpOn:string|null; createdAt:string; updatedAt:string; urgency:'overdue'|'today'|'later'|'none'; daysOverdue:number|null}`
  - `type Note = {id; body; createdAt; author:{name:string; role:Role}}`
  - `type Activity = {id; type; payload; createdAt; actor:{name:string}}`
  - `type ContactDetail = ContactRow & {summary:string|null; notes:Note[]; activities:Activity[]}`
- **`list-query.ts`:**
  - `PAGE_SIZES = [25,50,100,250,500] as const` and `DEFAULT_PAGE_SIZE = 250`
  - `SORT_KEYS = ['follow_up','name','waiting','updated','status'] as const`
  - `type Filters = {q?:string; status?:Status[]; matterType?:MatterType[]; referralSource?:ReferralSource[]; followUp?:FollowUpFilter|'custom'; followUpFrom?:string; followUpTo?:string; createdFrom?:string; createdTo?:string}`
  - `listQueryParsers` (nuqs). URL keys: `q, status, matter, source, fu, fuFrom, fuTo, createdFrom, createdTo, sort (default 'follow_up'), dir (default 'asc'), page (default 1), size (default 250, literal of PAGE_SIZES)`. Invalid values fall back to the defaults.
  - `loadListQuery = createLoader(listQueryParsers)`
  - `toFilters(q: ListQuery): Filters`
  - `countActiveFilterGroups(f: Filters): number` (q is excluded)
  - `clampPage(page:number, matching:number, pageSize:number): number`
- **`facets.ts`:** `ContactFacetsSchema` matching spec §7.3 exactly, and `type ContactFacets`.

- [ ] **Step 1: Write the failing tests.**

```ts
// lib/contracts/contact.test.ts
const schema = makeContactInputSchema({ today: '2026-11-16' })
it('requires email or phone', () => {
  const r = schema.safeParse({ fullName: 'Marisol Ortega', email: '', phone: '', matterType: 'family' })
  expect(r.success).toBe(false)
  expect(r.error!.issues.find(i => i.path[0] === 'contactMethod')!.message).toBe('Add an email or a phone number.')
})
it('trims names and rejects whitespace-only', () => { /* '  Ana  ' → 'Ana'… '   ' → issue on fullName */ })
it('accepts unicode and apostrophes', () => { /* "Zoë O'Brien-Núñez" ok */ })
it('rejects a past follow-up only when it changed', () => {
  expect(schema.safeParse({ ...valid, followUpOn: '2026-11-15' }).success).toBe(false)
  const edit = makeContactInputSchema({ today: '2026-11-16', previousFollowUpOn: '2026-11-10' })
  expect(edit.safeParse({ ...valid, followUpOn: '2026-11-10' }).success).toBe(true)
})
it('phone needs at least 7 digits', () => { /* '(512) 555-0148' ok; '555' fails */ })
// lib/contracts/list-query.test.ts
it('falls back on invalid params', async () => {
  const q = loadListQuery({ status: 'foo', size: '7', page: '-2', sort: 'x' })
  expect(q).toMatchObject({ status: null, size: 250, page: 1, sort: 'follow_up' })
})
it('clampPage', () => { expect(clampPage(5, 30, 25)).toBe(2); expect(clampPage(3, 0, 25)).toBe(1) })
it('countActiveFilterGroups ignores q', () => { expect(countActiveFilterGroups({ q: 'x', status: ['lead'] })).toBe(1) })
```

- [ ] **Step 2: Run** `pnpm test lib/contracts`. Expected: FAIL (modules missing).
- [ ] **Step 3: Install** `zod@4`, `nuqs@2` and `date-fns@4`, then implement the files above.
- [ ] **Step 4: Run** `pnpm test lib/contracts && pnpm typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** the tests first (`"Add failing contract tests"`), then the implementation (`"Add shared Zod contracts for contacts, filters, facets, auth and RBAC"`).

### Task 3: Date and urgency helpers

**Files:**
- Create: `lib/dates/date-only.ts`, `lib/dates/labels.ts`
- Test: `lib/dates/date-only.test.ts`, `lib/dates/labels.test.ts`

**Interfaces (produces):**
- `toDateOnly(d: Date): string`, using date-fns `format(d,'yyyy-MM-dd')` in local time
- `parseDateOnly(s: string): Date` (local midnight)
- `todayIn(tz: string, now?: Date): string`, via `Intl.DateTimeFormat('en-CA',{timeZone:tz})`
- `resolveTimeZone(raw?: string|null): string`: try/catch around `new Intl.DateTimeFormat('en',{timeZone:raw})`, falling back to `'UTC'`
- `addDaysDateOnly(s: string, n: number): string`
- `followUpView(row: Pick<ContactRow,'status'|'followUpOn'|'urgency'|'daysOverdue'>, today: string): {tone:'overdue'|'today'|'later'|'none'|'muted'; text:string}`
- `formatDateShort(dateOnly: string, today: string): string` gives `'Fri, Nov 20'`, adding `', 2027'` when the year differs
- `waitingLabel(createdAt: string, today: string, tz: string): string` gives `'Today'` or `'4d'`
- `formatTimestamp(iso: string, tz: string): string` gives `'Nov 13, 4:12 PM'`

- [ ] **Step 1: Write the failing tests.**

```ts
it('toDateOnly never shifts the date', () => {
  expect(toDateOnly(new Date(2026, 10, 16, 23, 59))).toBe('2026-11-16')
})
it('todayIn differs across extreme zones at the same instant', () => {
  const now = new Date('2026-11-16T11:30:00Z')
  expect(todayIn('Pacific/Kiritimati', now)).toBe('2026-11-17')
  expect(todayIn('Pacific/Pago_Pago', now)).toBe('2026-11-16')
})
it('resolveTimeZone accepts aliases and rejects junk', () => {
  expect(resolveTimeZone('Asia/Calcutta')).toBe('Asia/Calcutta')
  expect(resolveTimeZone('UTC')).toBe('UTC')
  expect(resolveTimeZone('Mars/Base')).toBe('UTC')
})
it('followUpView', () => {
  expect(followUpView({ status: 'lead', followUpOn: '2026-11-14', urgency: 'overdue', daysOverdue: 2 }, T).text).toBe('Overdue · 2d')
  expect(followUpView({ status: 'active', followUpOn: T, urgency: 'today', daysOverdue: null }, T).text).toBe('Today')
  expect(followUpView({ status: 'closed', followUpOn: '2026-11-01', urgency: 'later', daysOverdue: null }, T).tone).toBe('muted')
  expect(followUpView({ status: 'lead', followUpOn: null, urgency: 'none', daysOverdue: null }, T).text).toBe('Not set')
})
```

- [ ] **Step 2: Run** `pnpm test lib/dates`. Expected: FAIL.
- [ ] **Step 3: Implement** the functions above.
- [ ] **Step 4: Run** `pnpm test lib/dates`. Expected: PASS.
- [ ] **Step 5: Commit** the failing tests, then `"Add time-zone-safe date and urgency helpers"`.

### Task 4: Design tokens, Supabase project skeleton and the fake data layer

**Files:**
- Create: `DESIGN.md`, `lib/dates/server.ts`, `lib/data/index.ts`, `lib/data/fake.ts`, `lib/data/fixtures.ts`, `supabase/config.toml` (via `supabase init`)
- Modify: `app/globals.css`, `app/layout.tsx`
- Test: `lib/data/fake.test.ts`

**Interfaces (produces):**
- **CSS variables in `globals.css` `:root`**, exposed through Tailwind 4 `@theme`. The values are verbatim from spec §8.13 light theme:
  - surfaces: `--canvas`, `--surface`, `--panel`
  - lines: `--line`, `--line-soft`
  - text: `--ink`, `--ink-2`
  - accent: `--accent`, `--accent-soft`
  - urgency: `--overdue`, `--overdue-bg`, `--today`, `--today-bg`
  - status pills: `--lead-border`, `--closed-bg`
  - radii: `--r-ctl:6px`, `--r-surface:10px`
  - focus ring: `--ring:#CFE3D9`
  - Also: `::selection`, `caret-color`, scrollbar and `:focus-visible` (a 3px ring) themed.
- **Figtree** through `next/font/google` (weights 400–700, `display:'swap'`, variable `--font-sans`). `font-variant-numeric: tabular-nums` utility class `.tnum`.
- **`getRequestTimeZone(): Promise<string>`** reads the `tz` cookie and applies `resolveTimeZone`.
- **`lib/data/index.ts`** re-exports these signatures from `./fake` (switched to `./supabase` in T22):
  - `searchContacts(q: ListQuery): Promise<{rows: ContactRow[]; total: number; matching: number}>`
  - `getContactFacets(f: Filters): Promise<ContactFacets>`
  - `getPipelineColumn(status: Status, f: Filters, offset: number, limit?: number): Promise<{rows: ContactRow[]; matching: number}>`
  - `getContact(id: string): Promise<ContactDetail | null>`
- **`fixtures.ts`:** `makeFixtureRows(n: number, today: string): ContactRow[]`. It's deterministic, uses the names from the mockups, and gives about 2% overdue and 1% due today.
- **`supabase/config.toml`:** `[auth] enable_signup = false`, `[auth.email] enable_signup = false`, anonymous sign-ins off, `site_url = "http://localhost:3000"`.

- [ ] **Step 1: Write the failing test** `lib/data/fake.test.ts`. `searchContacts` with `{status:['lead'], page:1, size:25, sort:'follow_up'}` returns at most 25 rows, all with status lead, ordered by the urgency rule. `getContactFacets({status:['lead']}).facets.status.active` is greater than 0 (other groups are excluded from their own counts).
- [ ] **Step 2: Run** `pnpm test lib/data`. Expected: FAIL.
- [ ] **Step 3: Implement** the tokens, font, `DESIGN.md` (tokens, type scale 12/13/14/16/20/24, radii, states, and the rule "warm colours mean urgency only"), `supabase init` with the config above, and the fake data layer implementing the same filter semantics in memory.
- [ ] **Step 4: Run** `pnpm test && pnpm lint && pnpm build`. Expected: PASS. The colour-literal check passes.
- [ ] **Step 5: Commit** `"Add design tokens, Figtree, Supabase config and fake data layer"`. M0 is done: open the BE, FE and OPS worktrees from `main`.

---

## BE track (worktree `be`)

### Task 5: RBAC schema, tables and RLS

**Files:**
- Create: `supabase/migrations/2026111601_rbac.sql`, `2026111602_contacts.sql`
- Create: `tests/integration/setup.ts`, `tests/integration/rbac.test.ts`

**Interfaces (produces):**
- Types: `app_role`, `app_permission`, `contact_status`, `matter_type`, `referral_source`, `activity_type` (values verbatim from spec §6).
- Tables: `profiles`, `role_permissions` (seeded in the migration with `ROLE_PERMISSIONS`), `contacts`, `notes`, `activities`, with the columns from spec §6.
  - `phone_digits` is `generated always as (regexp_replace(coalesce(phone,''), '\D', '', 'g')) stored`.
  - The check is `email is not null or phone is not null`.
- `has_permission(p app_permission) returns boolean`: `language sql stable security definer set search_path = public`.
- **RLS (enabled on every table):**
  - `contacts`: select uses `(select has_permission('contacts.read'))`; insert and update use `(select has_permission('contacts.write'))`; there's no delete policy.
  - `notes`: select needs read; insert needs `notes.write` and `author_id = auth.uid()`.
  - `activities`: select needs read.
  - `profiles`: select for any authenticated user; no writes.
  - `role_permissions`: select for authenticated users.
- Indexes: `contacts(status, follow_up_on)`, `contacts(created_at)`, `contacts(updated_at)`, and a partial index `where deleted_at is null`.
- **`tests/integration/setup.ts`** exports `adminClient()`, `viewerClient()` and `serviceClient()`. These are supabase-js clients pointed at the local Supabase: the secret-key client creates `it-admin@caseflow.test` and `it-viewer@caseflow.test` with profiles, and the others sign in as them. It also exports `resetData()` (truncates contacts, notes and activities through the service client), a `seedContact(client, partial)` helper, and `rpc(client, name, args)` (calls the RPC and throws on error).

- [ ] **Step 1: Write the failing tests** `rbac.test.ts`.

```ts
it('viewer can read but not insert, update or note', async () => {
  const v = await viewerClient(); const a = await adminClient()
  const { data: c } = await seedContact(a, { full_name: 'Ana Ruiz', phone: '5125550101', matter_type: 'family' })
  expect((await v.from('contacts').select('id').eq('id', c.id)).data).toHaveLength(1)
  expect((await v.from('contacts').insert({ full_name: 'X Y', phone: '5125550102', matter_type: 'family' })).error).not.toBeNull()
  const upd = await v.from('contacts').update({ full_name: 'Hacked' }).eq('id', c.id).select()
  expect(upd.data ?? []).toHaveLength(0)
  expect((await v.from('notes').insert({ contact_id: c.id, body: 'x', author_id: v.userId })).error).not.toBeNull()
})
it('admin can insert, update and add notes', async () => { /* all succeed */ })
it('role_permissions matches ROLE_PERMISSIONS', async () => { /* select * → grouped equals the TS constant */ })
it('rejects contact with neither email nor phone', async () => { /* check violation */ })
```

- [ ] **Step 2: Run** `supabase start && supabase db reset && pnpm test:integration rbac`. Expected: FAIL (no tables).
- [ ] **Step 3: Write** the two migrations.
- [ ] **Step 4: Run** `supabase db reset && pnpm db:types && pnpm test:integration rbac`. Expected: PASS.
- [ ] **Step 5: Commit** the failing tests, then `"Add RBAC tables, contacts schema and RLS policies"`.

### Task 6: Audit, delete-guard and activity triggers

**Files:**
- Create: `supabase/migrations/2026111603_triggers.sql`
- Test: `tests/integration/triggers.test.ts`

**Interfaces (produces):**
- **`contacts_before_write()`** (BEFORE INSERT OR UPDATE):
  - On insert, sets `created_by = coalesce(created_by, auth.uid())`.
  - Always sets `updated_at = now()` and `updated_by = auth.uid()`.
  - If `deleted_at` changes and `not has_permission('contacts.delete')`, raises `insufficient_privilege` with the message `'forbidden: contacts.delete'`.
- **`contacts_after_write()`** (AFTER INSERT OR UPDATE). It returns early when `current_setting('caseflow.seeding', true) = 'on'`. Otherwise it inserts activities with `actor_id = auth.uid()`:
  - insert → `created` with `{status}`
  - status changed → `status_changed` with `{from,to}`
  - `follow_up_on` changed → `follow_up_changed` with `{from,to}`
  - `deleted_at` set → `deleted`; `deleted_at` cleared → `restored`
  - other column changes → `updated` with `{fields:[...]}`
- **`notes_after_insert()`:** inserts a `note_added` activity.

- [ ] **Step 1: Write the failing tests.**
  - Updating status from lead to active produces exactly one `status_changed` activity, with payload `{from:'lead',to:'active'}` and `actor_id` equal to the admin.
  - Adding a note produces `note_added`.
  - A viewer can't set `deleted_at`. An admin can (giving `deleted`), and clearing it gives `restored`.
  - With `select set_config('caseflow.seeding','on',true)` in the same transaction (run through an RPC test helper), no activities are written.
  - `updated_at` advances on every update.
- [ ] **Step 2: Run** `pnpm test:integration triggers`. Expected: FAIL.
- [ ] **Step 3: Write** the migration.
- [ ] **Step 4: Run** `supabase db reset && pnpm test:integration`. Expected: PASS.
- [ ] **Step 5: Commit** `"Add audit, delete-guard and activity triggers"`.

### Task 7: Seed (accounts and firm data)

**Files:**
- Create: `supabase/migrations/2026111604_seed_fn.sql`, `scripts/seed.ts`
- Test: `tests/integration/seed.test.ts`

**Interfaces (produces):**
- **`seed_firm(n int default 2500, actor uuid default null) returns void`**: `security definer`, executable only by `service_role`.
  - It sets `caseflow.seeding`, truncates contacts (cascading to notes and activities), and calls `setseed(0.42)`.
  - It generates `n` contacts: names from first-name and last-name arrays (at least 60 each, diverse), the matter, source and status mix (about 26% lead, 26% active, 48% closed), phone-only, email-only and both in roughly 20/20/60, and summaries drawn from templates per matter type.
  - Follow-ups: about 2% overdue (1–10 days), about 1% today, about 60% within the next 1–45 days, and the rest null (closed contacts mostly null).
  - `created_at` falls within the last 120 days.
  - Notes: 0–3 per contact. Activities: `created` plus any status changes, with `actor_id = actor`.
- **`scripts/seed.ts`:**
  - Reads `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SEED_ADMIN_PASSWORD` and `SEED_VIEWER_PASSWORD`.
  - Upserts the Auth users `admin@caseflow.test` (display name "Alex Morgan", role admin) and `viewer@caseflow.test` ("Sam Patel", viewer) with `email_confirm:true`. If a user exists, it updates the password.
  - Upserts `profiles`, then calls `seed_firm(2500, adminId)`.
  - Logs only the counts, never secrets.

- [ ] **Step 1: Write the failing tests.**
  - After running the seed twice: exactly 2 profiles with the right roles, a contacts count of 2500, and no duplicate `created` activities (activities count equals contacts count plus the status-change count).
  - The overdue count among lead and active contacts is between 1% and 4% of 2500.
  - The admin can sign in with `SEED_ADMIN_PASSWORD`.
- [ ] **Step 2: Run** `pnpm test:integration seed`. Expected: FAIL.
- [ ] **Step 3: Implement** the SQL function and the script.
- [ ] **Step 4: Run** `supabase db reset && pnpm seed && pnpm test:integration`. Expected: PASS.
- [ ] **Step 5: Commit** `"Add idempotent seed for role accounts and 2,500 firm contacts"`.

### Task 8: Query RPCs (`search_contacts` and `contact_facets`)

**Files:**
- Create: `supabase/migrations/2026111605_queries.sql`
- Test: `tests/integration/queries.test.ts`

**Interfaces (produces):**
- **`safe_tz(tz text) returns text`:** returns `tz` if it's in `pg_timezone_names`, otherwise `'UTC'`.
- **`contact_matches(c contacts, f jsonb, today date, skip text default null) returns boolean`** (`stable`). Every filter in `Filters` applies, except the group named by `skip`:
  - `q` is `ilike '%'||q||'%'` on `full_name`, `email` and `summary`, plus `phone_digits like '%'||digits(q)||'%'` when `q` has 3 or more digits
  - the array filters
  - `followUp` uses the urgency rules (only lead and active count for overdue and today; `next7Days` is `today <= d < today+7`; `none` is `follow_up_on is null`; custom uses `followUpFrom`/`followUpTo`; the jsonb keys are exactly the `Filters` field names)
  - the created range
  - `deleted_at is null`
- **`search_contacts(f jsonb, sort text, dir text, page int, page_size int, tz text) returns jsonb`** returns `{rows:[…], total:int, matching:int}`, with rows in `ContactRow` shape (snake_case, plus `urgency` and `days_overdue`).
  - `security invoker`, so RLS applies.
  - `page_size` is clamped to the allowed sizes, and `sort` is whitelisted.
  - `today = (now() at time zone safe_tz(tz))::date`.
  - The follow-up sort key:

```sql
order by case when c.status in ('lead','active') and c.follow_up_on < today then 0
              when c.status in ('lead','active') and c.follow_up_on = today then 1
              when c.status in ('lead','active') and c.follow_up_on is not null then 2
              when c.follow_up_on is not null then 3 else 4 end,
         c.follow_up_on asc nulls last, c.updated_at desc
-- dir='desc' reverses only the first two keys; other sorts: name→full_name, waiting→created_at, updated→updated_at, status→status
```

- **`ping() returns int`:** `security definer`, returns 1, `grant execute to anon`. The keep-alive job (T21) calls it.
- **`contact_facets(f jsonb, tz text) returns jsonb`** has the spec §7.3 shape. It makes one pass over `contacts where deleted_at is null`, with `count(*) filter (where contact_matches(c, f, today, '<group>') and <option predicate>)` for each option.
  - `quickViews.overdue` and `quickViews.dueToday` apply every filter except `followUp`.
  - `matching` applies everything.
  - `total` counts every non-deleted row.

- [ ] **Step 1: Write the failing tests** (seeded with a fixed set of about 40 contacts through `seedContact`).

```ts
it.each(FILTER_CASES)('facets agree with search totals: %s', async (_, f) => {
  const s = await rpc('search_contacts', { f, sort: 'follow_up', dir: 'asc', page: 1, page_size: 25, tz: 'UTC' })
  const fc = await rpc('contact_facets', { f, tz: 'UTC' })
  expect(fc.matching).toBe(s.matching)
  for (const st of selectedStatuses(f)) expect(sum(fc.facets.status, selectedStatuses(f))).toBe(s.matching)
})
it('urgency order puts overdue, then today, then soonest, then none', async () => { /* ids in expected order */ })
it('closed contacts with past dates are not overdue', async () => { /* urgency !== 'overdue' */ })
it('phone search matches digits typed without formatting', async () => { /* q='5550148' finds '(512) 555-0148' */ })
it('today differs by zone', async () => { /* follow_up_on = 2026-11-17: 'today' in Pacific/Kiritimati at a fixed instant via set local timezone, 'later' in UTC */ })
it('invalid tz falls back to UTC', async () => { /* tz 'Mars/Base' works */ })
it('viewer can call both RPCs', async () => {})
```

  `FILTER_CASES` has at least 6 cases: `{}`, `{status:['lead']}`, `{status:['lead','active'], followUp:'overdue'}`, `{matterType:['family'], q:'or'}`, `{followUp:'none'}`, and `{createdFrom, createdTo}`.
- [ ] **Step 2: Run** `pnpm test:integration queries`. Expected: FAIL.
- [ ] **Step 3: Write** the migration. To make "now" testable, use an optional `now_override timestamptz default null` parameter that only `service_role` may pass; the app never sends it.
- [ ] **Step 4: Run** `supabase db reset && pnpm db:types && pnpm test:integration`. Expected: PASS.
- [ ] **Step 5: Commit** `"Add search_contacts and contact_facets RPCs with a shared predicate"`.

### Task 9: Supabase clients, the real data layer, viewer and proxy

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/data/supabase.ts`, `lib/auth/viewer.ts`, `proxy.ts`
- Test: `lib/data/supabase.test.ts` (mapper unit tests), and add to `tests/integration/queries.test.ts`

**Interfaces (produces):**
- **`lib/supabase/server.ts`:** `createServerSupabase(): Promise<SupabaseClient<Database>>`, built with `@supabase/ssr` `createServerClient` and Next `cookies()`, using the publishable key.
- **`lib/supabase/admin.ts`:**
  - `createSignInClient(clientIp: string|null)`: secret key, `auth:{persistSession:false}`, and `global.headers['Sb-Forwarded-For'] = clientIp` when present.
  - `createServiceClient()`: used only by scripts and tests.
- **`lib/data/supabase.ts`:** implements the four signatures from Task 4. Each calls the RPCs with `tz` from `getRequestTimeZone()` and parses the responses with the contract schemas.
  - `getContact` joins notes with the author profile and activities with the actor profile (limit 100), and returns `null` when the contact is missing.
  - Mappers: `mapContactRow(raw): ContactRow` (snake to camel).
- **`lib/auth/viewer.ts`:**
  - `getViewer = cache(async (): Promise<Viewer|null>)`, using `Viewer` from `lib/contracts/permissions` (T2). It uses `supabase.auth.getClaims()` to verify the session, then reads `profiles`.
  - `requirePermission(p: Permission): Promise<Viewer>`. With no session it redirects to `/login?reason=expired`. Without the permission it calls the Next 16 `forbidden()` API if the pinned version has it; otherwise it throws a `ForbiddenError` that `app/(app)/layout` renders as `ForbiddenState`.
  - `assertPermission(p): Promise<Result<Viewer>>` is the variant for actions: it returns `fail('unauthorized'|'forbidden', …)`.
- **`proxy.ts`:** refreshes the session (the `@supabase/ssr` pattern). Unauthenticated requests to anything other than `/login`, `/_next`, static files and `/favicon.ico` are redirected to `/login?next=<path>`. If an `sb-` auth cookie existed but the session is invalid, it adds `&reason=expired`. An authenticated user visiting `/login` is redirected to `/contacts`.

- [ ] **Step 1: Write the failing tests.**
  - `mapContactRow` maps `days_overdue` to `daysOverdue`, and keeps `follow_up_on` as a `YYYY-MM-DD` string.
  - Integration: `searchContacts` through a request-scoped client signed in as the viewer returns rows that parse with `ContactRowSchema`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** everything above.
- [ ] **Step 4: Run** `pnpm test && pnpm test:integration && pnpm typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `"Add Supabase clients, real data layer, getViewer and proxy"`.

### Task 10: Mutations and Server Actions (contacts, notes, sign-in)

**Files:**
- Create: `lib/data/mutations.ts`, `features/contacts/actions.ts`, `features/auth/actions.ts`
- Test: `tests/integration/mutations.test.ts`, `features/auth/actions.test.ts`

**Interfaces (produces; FE components receive these as props until T22):**
- **`lib/data/mutations.ts`.** Each takes `(db: SupabaseClient<Database>, …)` and returns a `Result`:
  - `insertContact(db, input: ContactInput): Result<{id}>`
  - `updateContact(db, id, input, expectedUpdatedAt: string): Result<ContactRow>`. It runs `update … where id=$1 and updated_at=$2`. With 0 rows: if the row exists, return `conflict` ("This contact was changed since you opened it."), otherwise `not_found`.
  - `setStatus(db, id, status): Result<ContactRow>`
  - `setFollowUp(db, id, followUpOn: string|null): Result<ContactRow>`
  - `insertNote(db, contactId, body): Result<Note>`
  - PostgREST and RLS errors map to codes: `42501` or an empty update under RLS becomes `forbidden`, and `23514` becomes `validation`.
- **`features/contacts/actions.ts`** (`'use server'`):
  - `createContactAction(raw: unknown)`
  - `updateContactAction(id: string, raw: unknown, expectedUpdatedAt: string)`
  - `moveContactAction(id: string, status: Status)`
  - `rescheduleAction(id: string, followUpOn: string|null)`
  - `addNoteAction(contactId: string, body: string)`
  - Order in each: `assertPermission` → `makeContactInputSchema({today: todayIn(tz), previousFollowUpOn})` validation (Zod issues become `fieldErrors` keyed by field, with `contactMethod` for the cross-field rule) → mutation → `revalidatePath('/contacts')`, `revalidatePath('/pipeline')`, `revalidatePath('/contacts/'+id)`.
- **`features/auth/actions.ts`:**
  - `signInAction(prev: Result<null>|null, formData: FormData): Promise<Result<null>>`:
    1. Validate with `SignInSchema`.
    2. `createSignInClient(ip)` with `signInWithPassword`, where the IP is the first entry of `x-forwarded-for`.
    3. On success, `(await createServerSupabase()).auth.setSession(tokens)`, set the cookie `tz=resolveTimeZone(formData.get('tz'))` (path `/`, one year, `sameSite: 'lax'`), and `redirect(safeNext(formData.get('next')) ?? '/contacts')`.
    - Error mapping: `invalid_credentials` gives "Email or password is incorrect."; HTTP 429 gives `rate_limited` with "Too many attempts. Try again in N minutes." (N from `retryAfter`, default 5); anything else gives `server`.
    - `safeNext` only accepts same-origin paths starting with `/` and not `//`.
  - `signOutAction()`: signs out and redirects to `/login`.

- [ ] **Step 1: Write the failing tests.**
  - Integration: `updateContact` with a stale `expectedUpdatedAt` returns `{ok:false,error:{code:'conflict'}}`.
  - Viewer `setStatus` returns `forbidden`.
  - `insertNote` with an empty body returns `validation`.
  - Unit (with the Supabase client and `next/headers` mocked):
    - a 429 maps to `rate_limited` with `retryAfter`
    - wrong credentials map to `invalid_credentials` with the exact copy
    - `safeNext('//evil.com')` returns null
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** everything above.
- [ ] **Step 4: Run** `pnpm test && pnpm test:integration`. Expected: PASS.
- [ ] **Step 5: Commit** `"Add mutations with conflict detection and permission-checked Server Actions"`.

---

## FE track (worktree `fe`)

Every component uses tokens only and is shown in `/dev/components` with every state. Render it and compare against the mockups; run `impeccable detect` on the changed files at the end of each task (the command is in T24).

### Task 11: Primitives, part 1 (no Radix)

**Files:**
- Create: `components/ui/{button,input,textarea,field,checkbox,radio-group,segmented,pill,chip,skeleton,empty-state,error-state}.tsx`, `app/dev/components/page.tsx`
- Test: `components/ui/field.test.tsx`, `components/ui/button.test.tsx`

**Interfaces (produces):**
- **`Button`**: `{variant:'primary'|'ghost'|'link'; size?:'sm'|'md'; pending?:boolean; pendingLabel?:string; disabledReason?:string}`. `pending` sets `aria-busy` and blocks clicks. `disabledReason` sets `aria-disabled="true"`, keeps the button focusable, prevents `onClick`, and wraps it in `Tooltip` (T12; until then, a `title` attribute).
- **`Input`** and **`Textarea`**: forward refs, `aria-invalid` and `aria-describedby`. `Textarea` accepts `maxLength` and shows a `n / max` counter once the length passes 80% of the maximum.
- **`Field`**: `{label; required?; hint?; error?; id; children}` renders the label ("Required" marker), hint, and an error with an icon tied by `aria-describedby`. **`ErrorSummary`**: `{errors: {id:string; label:string; message:string}[]}` renders `role="alert"` with "N fields need attention." plus links, and focuses itself when `errors` goes from empty to non-empty.
- **`StatusPill`** `{status}` and **`UrgencyPill`** `{tone; text}`, both from the mockup classes.
- **`Chip`** `{label:string; value:string; onRemove(): void}`. Its remove button is 24px with `aria-label="Remove {label} filter"`.
- **`Skeleton`** `{className}`.
- **`EmptyState`** `{icon; title; description?; action?}` and **`ErrorState`** `{title; description; onRetry?(): void}`.
- **`Checkbox`**, **`RadioGroup`** and **`Segmented`** (`role="radiogroup"`, arrow-key navigation).

- [ ] **Step 1: Write the failing tests.**
  - `ErrorSummary` gets focus when errors appear, and each link's `href` is `#fieldId`.
  - A `Button` with `pending` calls `onClick` zero times when clicked twice.
  - A `Button` with `disabledReason` has `aria-disabled="true"`, can be focused with Tab, and doesn't fire `onClick`.
  - The `Chip` remove button has the accessible name "Remove Status filter".
- [ ] **Step 2: Run** `pnpm test components/ui`. Expected: FAIL.
- [ ] **Step 3: Implement** the primitives and the gallery page (with `notFound()` when `process.env.VERCEL_ENV === 'production'`).
- [ ] **Step 4: Run** `pnpm test && pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `"Add base UI primitives and dev gallery"`.

### Task 12: Primitives, part 2 (Radix, date picker, toasts)

**Files:**
- Create: `components/ui/{dialog,sheet,popover,dropdown-menu,tooltip,date-picker,toaster}.tsx`
- Test: `components/ui/date-picker.test.tsx`, `components/ui/dropdown-menu.test.tsx`

**Interfaces (produces):**
- Thin styled wrappers over `@radix-ui/react-{dialog,popover,dropdown-menu,tooltip}`, animated with CSS `data-state` keyframes (150–200ms, ease-out) and disabled under `prefers-reduced-motion`.
- **`Sheet`**: `{side:'right'; title; children; footer}`, built on Dialog (modal; Esc, scrim and ✕ close it; focus returns to the trigger).
- **`DatePicker`**: `{value:string|null; onChange(v:string|null):void; min?:string; label}`. It uses react-day-picker inside a Popover, **and converts with `toDateOnly`**. It also has a Clear action.
- **`Toaster`**: sonner with token styles, mounted in the root layout. `toast.success(msg)`.

- [ ] **Step 1: Write the failing tests.**
  - Picking Nov 20 in `DatePicker` calls `onChange('2026-11-20')`, even when the mocked system time zone is `Pacific/Kiritimati`.
  - Days before `min` are disabled.
  - `DropdownMenu` opens with Enter, items can be reached with the arrow keys, and Esc returns focus to the trigger.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the wrappers. Install the Radix packages, `react-day-picker@9`, `sonner` and `lucide-react`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `"Add Radix-based overlays, date picker and toaster"`.

### Task 12b: App-level error and status pages

**Files:**
- Create: `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`
- Test: `app/error.test.tsx`, `tests/e2e/not-found.spec.ts`
- `app/forbidden.tsx` stays in T13 (it needs `experimental.authInterrupts`; see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/forbidden.md`).

**Interfaces (produces):**
- **`not-found.tsx`:** "Page not found.", the requested path, a primary "Go to contacts" and a secondary "Pipeline" link. It renders inside the app shell when signed in.
- **`error.tsx`** (client boundary under the root layout): "Something broke on our side.", a short reason class (network, server or unknown), the error digest, and a "Go to contacts" link. Retry runs `startTransition(() => { router.refresh(); reset() })` (SPEC §8.8). It never shows a stack trace in production.
- **`global-error.tsx`:** catches root-layout crashes. It has its own `<html>` and `<body>`, Figtree, inline token values (`globals.css` isn't loaded there), a React `<title>` (not metadata) and a plain Reload button.
- All three reuse `EmptyState`, `ErrorState` and `Button` (T11), work on mobile, focus the heading on mount, are `noindex`, and use `role="alert"` on the error pages only.
- Deliberately skipped: `app/unauthorized.tsx` (the proxy redirects to `/login?reason=expired`) and a root `app/loading.tsx` (routes have their own skeletons).

- [ ] **Step 1: Write the failing tests.**
  - Unit: clicking Retry in `error.tsx` calls `router.refresh` and `reset`.
  - e2e: a bad URL returns 404 and shows "Page not found." with the path.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** everything above.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `"Add app-level not-found, error and global-error pages"`. This is its own small PR, after T12.

### Task 13: App shell, permissions context and forbidden state

**Files:**
- Create: `lib/auth/permissions-context.tsx`, `components/shell/{sidebar,tab-bar,account-block,page-header,timezone-sync,forbidden-state}.tsx`, `app/(app)/layout.tsx` (fake viewer until T22)
- Test: `lib/auth/permissions-context.test.tsx`, `components/shell/timezone-sync.test.tsx`

**Interfaces (produces):**
- **`PermissionsProvider`** `{viewer: Pick<Viewer,'displayName'|'role'|'permissions'>; children}`.
- **`usePermission(p: Permission): boolean`** and **`useViewer()`**.
- **`<Can p fallback?>`.**
- **`Sidebar`** (desktop ≥ 1024px, width 196px; a tooltip icon rail at 768–1023px) and **`TabBar`** (below 768px; sticky; safe-area padding; Contacts, Pipeline, Account).
- **`AccountBlock`**: display name, role badge ("Admin", or "Viewer · read-only" with a lock icon), and a Sign out form.
- **`PageHeader`** `{title; meta?; actions?}`.
- **`TimezoneSync`**: a client component. It compares `Intl.DateTimeFormat().resolvedOptions().timeZone` with the `tz` cookie on mount and on `visibilitychange`; if they differ, it sets the cookie and calls `router.refresh()`. On `focus` it also calls `router.refresh()` (to refresh labels after midnight).
- **`ForbiddenState`** `{action: string; backHref; backLabel}` renders "You can't {action}. Your role is Viewer, which is read-only. An admin can change your role or make this edit for you."
- A skip link and landmarks. **No custom route announcer.**

- [ ] **Step 1: Write the failing tests.**
  - `usePermission('contacts.write')` is false for the viewer fixture and true for the admin.
  - `<Can>` renders the fallback.
  - `TimezoneSync` with cookie `tz=UTC` while the mocked resolved zone is `America/Chicago` writes `tz=America/Chicago` and calls `refresh` once.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** everything above, following the mockups `direction-c-v5.html` (sidebar, tab bar) and `login-rbac-v1.html` (role badge, forbidden page).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `"Add app shell, permissions context, timezone sync and forbidden state"`.

### Task 14: Contacts list (table, cards, toolbar, pagination, states)

**Files:**
- Create: `features/contacts/url-state.ts`, `features/contacts/list/{toolbar,quick-views,filter-chips,contacts-table,contact-cards,pagination,sort-menu,empty-states}.tsx`, `app/(app)/contacts/{page,loading,error}.tsx`
- Test: `features/contacts/list/contacts-table.test.tsx`, `features/contacts/list/toolbar.test.tsx`

**Interfaces:**
- **Consumes:** `listQueryParsers`, `loadListQuery`, `clampPage`, `countActiveFilterGroups` (T2); `followUpView`, `formatDateShort`, `waitingLabel` (T3); `searchContacts`, `getContactFacets` (T4); the primitives (T11–T12).
- **Produces:**
  - `useListQuery()`, a nuqs `useQueryStates(listQueryParsers, {shallow:false, startTransition})` hook returning `[query, setQuery, isPending]`. **Every setter except the one for `page` also sets `page: 1`.**
  - `ContactsTable` `{rows: ContactRow[]; matching: number; sort; dir; onSort(key)}`. It uses TanStack Table (`manualSorting`) and TanStack Virtual (row height 36, overscan 12) with `<table>` semantics, `aria-rowcount={matching+1}` and `aria-rowindex` on each row.
    - Sortable headers are `<button>`s inside a `<th aria-sort>`.
    - The Name cell is a `<Link>` to `/contacts/{id}`, truncated with a `title` attribute. Email is truncated at `max-w-[180px]`.
    - From 1024–1279px the table scrolls horizontally with Name pinned.
  - `ContactCards` `{rows}` (below 768px). Line 1 is the name and the urgency pill; line 2 is matter, status pill and a `tel:` link.
  - `Toolbar` `{facets; isPending}`:
    - search (250ms debounce, a spinner while pending, Esc clears it)
    - the Filters button with `aria-expanded` and a count badge
    - `QuickViews`, a segmented control of links with live counts: All, Overdue (count in `--overdue`) and Due today
    - `FilterChips`, which remove instantly
  - `Pagination` `{page; pageSize; matching}`. It shows "1–250 of 1,284", a page-size select (`PAGE_SIZES`), and first/prev/numbered pages/…/next/last. Changing the page scrolls the table to the top and focuses its caption.
  - `SortMenu` (mobile).
  - `EmptyStates`: `FirstRun` ("No contacts yet." plus New contact behind `<Can p="contacts.write">`, with the fallback "No contacts yet. An admin can add them.") and `Filtered` ("No contacts match these filters." listing the active filters, plus Clear filters).
  - **The page:** `loadListQuery(searchParams)`. If `page` is beyond `clampPage`, redirect with the clamped page. It renders the header "Contacts" and "{matching} of {total}", with New contact behind `<Can>`.
  - **`loading.tsx`:** 12 skeleton rows in the table shape.
  - **`error.tsx`:** `ErrorState` "Contacts didn't load." / "Check your connection and retry. Your filters are kept." Retry does `startTransition(() => { router.refresh(); reset() })`, or the retry API in the pinned Next docs.

- [ ] **Step 1: Write the failing tests.**

```tsx
it('virtualized table keeps semantics', () => {
  render(<ContactsTable rows={rows(500)} matching={1284} sort="follow_up" dir="asc" onSort={noop} />)
  expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '1285')
  expect(screen.getAllByRole('row').length).toBeLessThan(80)
})
it('sort header reflects aria-sort and toggles', async () => { /* Follow-up th aria-sort="ascending"; click Name → onSort('name') */ })
it('long names truncate with title', () => { /* 120-char name → cell link has title=name and class truncate */ })
it('changing search resets page to 1', async () => { /* nuqs testing adapter: page=5 → type 'ana' → page null/1 after debounce */ })
it('filtered empty state lists filters and clears', async () => {})
it('viewer sees no New contact button', () => {})
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** everything above. Install `@tanstack/react-table` and `@tanstack/react-virtual`, and use the nuqs adapter for the Next App Router in the root layout. Match `direction-c-v5.html`.
- [ ] **Step 4: Run.** Expected: PASS. Then render `/contacts` with the fake data at 1440, 1280, 768 and 390px wide and compare against the mockups.
- [ ] **Step 5: Commit** in two parts: `"Add contacts table, cards and pagination"` and `"Add contacts toolbar, quick views, chips and list states"`.

### Task 15: Filters panel (draft, Apply and Cancel)

**Files:**
- Create: `features/contacts/filters/use-filter-draft.ts`, `features/contacts/filters/filters-panel.tsx`
- Test: `features/contacts/filters/filters-panel.test.tsx`

**Interfaces:**
- **Consumes:** `useListQuery` (T14), `Sheet` (T12), `ContactFacets` (T2).
- **Produces:**
  - `useFilterDraft(applied: Filters)` returns `{draft, set(patch), clearAll(), apply(): Filters, reset()}`. `clearAll` resets the **draft** only.
  - `FiltersPanel` `{open; onOpenChange; facets; hideStatus?: boolean}`:
    - **Desktop (≥ 1024px):** a non-modal `<aside>` fixed below the toolbar, full height, with its own scroll. It has a sticky header (title "Filters · N", Clear all, ✕) and a sticky footer (Cancel, Apply).
    - **Mobile:** the same content inside a `Sheet`.
    - Groups: Status, Follow-up (Any / Overdue / Due today / Next 7 days / No follow-up set / Custom range… with two `DatePicker`s), Matter type, Referral source, Created date (range). Facet counts sit beside each option.
    - **Apply** writes the draft to the URL (page reset to 1) **and closes the panel.** **Cancel**, ✕ and Esc discard the draft and close it.
    - The open state is stored in the cookie `filters_open` (desktop only), so the server renders it as it was left.

- [ ] **Step 1: Write the failing tests.**
  - Ticking Active then Apply calls `setQuery` once with `status:['lead','active'], page:1`, and `onOpenChange(false)` fires.
  - Ticking then Cancel calls no `setQuery`, and reopening shows the applied state.
  - Clear all, then Cancel, keeps the applied filters.
  - Esc closes the panel and focus returns to the Filters button.
  - Double-clicking Apply calls `setQuery` once.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** everything above, matching `direction-c-v5.html`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `"Add filters panel with draft, Apply and Cancel"`.

### Task 16: Contact detail (header, follow-up, details, notes, timeline, move)

**Files:**
- Create: `features/contacts/detail/{contact-header,follow-up-card,details-list,notes,timeline,move-menu}.tsx`, `app/(app)/contacts/[id]/{page,loading,error,not-found}.tsx`
- Test: `features/contacts/detail/notes.test.tsx`, `features/contacts/detail/move-menu.test.tsx`

**Interfaces:**
- **Consumes:** `getContact` (T4), the action signatures from T10 (passed as props: `onMove`, `onReschedule`, `onAddNote`), `<Can>` and `usePermission` (T13).
- **Produces:**
  - `MoveMenu` `{current: Status; onMove(s): Promise<Result<ContactRow>>; disabledReason?: string}`. It's a DropdownMenu listing the other two statuses as pills. Reused by the pipeline.
  - `Notes` `{notes: Note[]; onAdd(body): Promise<Result<Note>>}`:
    - The composer's Save is disabled while the text is empty or a save is pending. Cmd/Ctrl+Enter submits.
    - **On failure the text is kept**, with an inline error and Retry. On success the field clears and the new note is announced.
    - For viewers, the composer is replaced with "Viewers can read notes but can't add them."
  - `Timeline` `{activities}`. Copy per type: "{actor} created this contact" / "moved this to {to}" / "set follow-up to {date}" / "added a note" / "edited {fields}" / "deleted" / "restored". Each uses a `<time dateTime>` with the full timestamp in a title.
  - `FollowUpCard`: an urgency pill, the date, and **Reschedule** (a DatePicker in a Popover, saving on select).
  - The **`not-found.tsx`** copy: "This contact doesn't exist." with "Back to contacts".

- [ ] **Step 1: Write the failing tests.**
  - Notes: an empty body disables Save. If `onAdd` resolves `{ok:false}`, the textarea keeps "Called back" and an error is visible. Double Cmd+Enter calls `onAdd` once.
  - `MoveMenu` for `current='lead'` offers Active and Closed only. With `disabledReason`, the trigger has `aria-disabled` and a tooltip with that reason.
  - `Timeline` renders "Alex Morgan moved this to Active" for a `status_changed` activity.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** everything above, matching `screens-v1.html` (detail and mobile detail with the Call button) and `login-rbac-v1.html` (viewer variant).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `"Add contact detail with notes, timeline, reschedule and move"`.

### Task 17: Contact form (create and edit)

**Files:**
- Create: `features/contacts/form/{contact-form.tsx,conflict-banner.tsx,use-unsaved-guard.ts}`, `app/(app)/contacts/new/page.tsx`, `app/(app)/contacts/[id]/edit/{page,loading}.tsx` (the loading file is a skeleton shaped like the form)
- Test: `features/contacts/form/contact-form.test.tsx`

**Interfaces:**
- **Consumes:** `makeContactInputSchema` (T2), `todayIn` (T3), `Field`, `ErrorSummary`, `DatePicker`, `Segmented` (T11–T12), and `createContactAction` / `updateContactAction` (T10, as props).
- **Produces:**
  - `ContactForm` `{mode:'create'|'edit'; initial?: ContactDetail; today: string; onSubmit(input): Promise<Result<{id}|ContactRow>>}`:
    - React Hook Form with `zodResolver(makeContactInputSchema({today, previousFollowUpOn: initial?.followUpOn}))`, mode `onTouched`.
    - Fieldsets: Person, Matter, Intake (layout from `screens-v1.html`).
    - On submit errors, `ErrorSummary` takes focus and links to each field; `contactMethod` errors render under the email/phone pair.
    - **Server `fieldErrors` are applied with `setError`.**
    - A `conflict` result shows `ConflictBanner` with "Reload latest" (`router.refresh()` plus a form reset to the server values) and "Overwrite" (resubmit with the new `updatedAt`).
    - Other failures show "Save failed. Your changes are still here." with Retry, keeping the input.
    - Success navigates to `/contacts/{id}` and shows the toast "Contact saved".
  - `useUnsavedGuard(isDirty)`: a `beforeunload` handler. Cancel asks for confirmation with a Dialog ("Discard changes?") when the form is dirty.
  - **Pages:** both call `requirePermission('contacts.write')` (the Viewer gets the forbidden state with action "edit contacts" or "add contacts"). Edit loads `getContact`, and gives `notFound()` when it's null.

- [ ] **Step 1: Write the failing tests.**
  - Submitting the empty form shows "2 fields need attention.", focuses the summary, and links to `#fullName` and `#contactMethod`.
  - A server result `{ok:false, error:{code:'validation', fieldErrors:{email:'Enter a valid email address.'}}}` renders under Email.
  - A `conflict` result renders the banner with both buttons.
  - Double-clicking Save calls `onSubmit` once.
  - A failed save keeps every field value.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** everything above. Install `react-hook-form` and `@hookform/resolvers`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `"Add create and edit contact form with error summary and conflict handling"`.

### Task 18: Pipeline board

**Files:**
- Create: `features/pipeline/{board,column,pipeline-card,mobile-tabs}.tsx`, `features/pipeline/use-board-moves.ts`, `app/(app)/pipeline/{page,loading,error}.tsx`
- Test: `features/pipeline/use-board-moves.test.tsx`, `features/pipeline/column.test.tsx`

**Interfaces:**
- **Consumes:** `getPipelineColumn`, `getContactFacets` (T4), `MoveMenu` (T16), `FiltersPanel` with `hideStatus` (T15), `moveContactAction` (T10, as a prop).
- **Produces:**
  - `useBoardMoves(columns: Record<Status,{rows;matching}>, onMove)` returns `{columns, move(id, to)}`. It uses `useOptimistic`: the card moves immediately and the counts update. Then:
    - on `ok`, the toast "{name} moved to {Status}." (6s)
    - on failure, the change rolls back and the error toast reads "Move failed. Retry." (with a Retry action), or "You don't have permission to move contacts." for `forbidden`
  - `Column` `{status; rows; matching; onLoadMore}`. The header shows the status and its count. "Show 50 more · {matching - rows.length} left" is a button that appends rows from `getPipelineColumn(status, f, rows.length)`, called through a Server Action wrapper `loadMoreColumnAction`.
  - `PipelineCard`: name link, urgency pill, "matter · phone", `MoveMenu`. Viewers see it disabled with the reason "Viewers can't move contacts."
  - `MobileTabs`: below 768px, one column at a time, using a segmented control with counts.
  - **The page:** three columns, each loading 50 rows plus facets. It shares search and Filters with the list (`hideStatus`).
  - `loading.tsx`: three skeleton columns. `error.tsx`: same pattern as the list. An empty column shows "No {Status} contacts."

- [ ] **Step 1: Write the failing tests.**
  - `move` moves the card to the target column before the promise resolves.
  - A rejected `onMove` restores the original column and counts.
  - A double-click on a move item calls `onMove` once.
  - `Column` shows "Show 50 more · 592 left" for `matching=642, rows=50`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** everything above, matching `screens-v1.html` (pipeline and mobile pipeline).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `"Add pipeline board with optimistic moves and per-column paging"`.

### Task 19: Login page

**Files:**
- Create: `features/auth/login-form.tsx`, `app/(auth)/login/page.tsx`
- Test: `features/auth/login-form.test.tsx`

**Interfaces:**
- **Consumes:** `signInAction` (T10; a stub action returning fixtures until T22), `SignInSchema` (T2).
- **Produces:** `LoginForm` `{action; reason?: 'expired'; next?: string}`:
  - `useActionState(action, null)`.
  - Hidden inputs `tz` (`Intl…timeZone`) and `next`.
  - The password field has a show/hide toggle (`aria-pressed`).
  - Client-side `SignInSchema` validation on submit, with errors per field.
  - The banner `role="alert"` for `invalid_credentials` / `rate_limited` (the Sign in button is disabled until `retryAfter` expires) / `server`.
  - `reason=expired` shows the info banner "Your session ended. Sign in to pick up where you left off."
  - The footer reads "Access is by invitation. Ask your administrator for an account."
  - Layout and copy come from `login-rbac-v1.html`.

- [ ] **Step 1: Write the failing tests.**
  - Submitting empty shows "Enter a valid email address." and "Enter your password.", and the action isn't called.
  - The `invalid_credentials` state renders "Email or password is incorrect." in an alert.
  - `reason='expired'` renders the info banner.
  - The pending state shows "Signing in…" with `aria-busy`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** everything above.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `"Add login page with validation, error and session-ended states"`.

---

## OPS track (worktree `ops`)

### Task 20: CI workflow and repo hygiene

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.github/pull_request_template.md`, `.github/CODEOWNERS` (`* @KhubaibQaiser`)

**Interfaces (produces):** the jobs `checks`, `integration-e2e` and `gitleaks`, run on `pull_request` and on `push` to `main`. `concurrency` cancels superseded runs.
- **`checks`:** `ubuntu-latest`, `pnpm/action-setup`, `setup-node` (`.nvmrc`, pnpm cache), `pnpm install --frozen-lockfile`, then `format:check`, `typecheck`, `lint`, `test`, `build`.
- **`integration-e2e`:**
  - `supabase/setup-cli@v1`, then `supabase start`, `supabase db reset`, and `pnpm seed` (environment from `supabase status -o env`; `SEED_*_PASSWORD` are fixed CI-only values in the workflow `env`, because they only exist for the local database).
  - Then `pnpm test:integration`, `pnpm exec playwright install --with-deps chromium`, and `pnpm e2e`.
  - On failure, upload the Playwright report.
- **`gitleaks`:** the pinned `gitleaks/gitleaks-action`, with `fetch-depth: 0`.

- [ ] **Step 1: Push a branch with the workflow and open a draft PR.** Expected: all three jobs run. Before T5 there's nothing to test, so `integration-e2e` passes with no tests (`--passWithNoTests`).
- [ ] **Step 2: Add a deliberate secret-like string on a scratch commit**, confirm gitleaks fails, then drop the commit.
- [ ] **Step 3: Add** Dependabot (npm and github-actions, weekly, grouped minor and patch updates), the PR template (Summary, Spec/ADR refs, Tests, Screenshots, Checklist: a11y, states, tokens), and CODEOWNERS.
- [ ] **Step 4: Commit** `"Add CI with checks, Supabase-backed integration and e2e, and gitleaks"`. Merge with a merge commit.

### Task 21: Provision Supabase and Vercel; deploy, seed and keep-alive workflows

**Files:**
- Create: `.github/workflows/deploy.yml`, `.github/workflows/seed.yml`, `.github/workflows/keep-alive.yml`, `vercel.json`

**Prerequisites from Khubaib:** `supabase login`, `npx vercel login`, `VERCEL_TOKEN` set with `gh secret set`, and the two demo passwords set with `gh secret set SEED_ADMIN_PASSWORD` / `SEED_VIEWER_PASSWORD`.

**Interfaces (produces):**
- **GitHub secrets:** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SEED_ADMIN_PASSWORD`, `SEED_VIEWER_PASSWORD`.
- **Vercel production environment:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- **`deploy.yml`:** on push to `main`, with `needs` on the CI jobs (via `workflow_run`, or by re-running `checks`). Then `supabase link --project-ref`, `supabase db push`, `vercel pull --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod`, and a smoke test that runs `pnpm exec playwright test tests/e2e/smoke.spec.ts` against the deployed URL.
- **`seed.yml`:** `workflow_dispatch`. Runs `pnpm seed` against production.
- **`keep-alive.yml`:** a daily cron (`17 6 * * *`). Uses `curl` against `${SUPABASE_URL}/rest/v1/role_permissions?select=role&limit=1` with the publishable key, calls `${SUPABASE_URL}/rest/v1/rpc/ping` (T8) with the publishable key. It fails the job on a non-200 response.

- [ ] **Step 1: Create the project.** `supabase orgs list`, then `supabase projects create caseflow --org-id <id> --region us-east-1 --db-password "$(openssl rand -base64 24)"`. Pipe the password **straight into** `gh secret set SUPABASE_DB_PASSWORD` in the same command, without echoing it.
- [ ] **Step 2: Push the auth configuration.** `supabase link` and `supabase config push` (sign-ups off). Enable `Sb-Forwarded-For` IP forwarding through the Management API if it's exposed; otherwise tell Khubaib the exact dashboard toggle. Pipe the keys from `supabase projects api-keys` into `gh secret set` and `vercel env add`.
- [ ] **Step 3: Create the Vercel project.** `npx vercel link` (project `caseflow`), then read the org and project IDs from `.vercel/project.json` into `gh secret set`. Disable Vercel's Git auto-deploy (`vercel.json`: `{"git": {"deploymentEnabled": false}}`).
- [ ] **Step 4: Write** the three workflows, then trigger `seed.yml` once (`gh workflow run seed.yml`). Expected: the run passes, and its log shows 2 profiles and 2500 contacts.
- [ ] **Step 5: Commit** `"Add deploy, seed and keep-alive workflows"`. Merge with a merge commit. The first real deploy happens in T23.

---

## Integration, deploy, hardening and submission

### Task 22: Wire the real data layer and the e2e suite

**Files:**
- Modify: `lib/data/index.ts` (re-export from `./supabase`); the pages and layouts that pass the T10 actions as props; `app/(app)/layout.tsx` (`getViewer()` instead of the fake viewer)
- Delete: `lib/data/fake.ts` (keep `fixtures.ts` only for component tests)
- Create: `tests/e2e/{auth,contacts,contact-form,detail,pipeline,viewer,mobile,a11y,smoke}.spec.ts`, `tests/e2e/helpers.ts` (`signInAs(page, 'admin'|'viewer')`)

- [ ] **Step 1: Write the failing e2e specs** (local Supabase, seeded):
  - **`auth.spec.ts`:**
    - field errors
    - wrong password gives "Email or password is incorrect."
    - Admin sign-in lands on `/contacts`
    - sign out
    - "expired session on save redirects with next" (corrupt the `sb-*` cookie, click Save on the edit form, expect `/login?reason=expired&next=%2Fcontacts%2F…`)
  - **`contacts.spec.ts`:**
    - search "5550148" finds the row
    - filter Status, Apply (the panel closes), then the chip and the count "N of 2,500"
    - reload keeps the state
    - sort by Name toggles `aria-sort`
    - page size 50 and page 2, then a filter change resets to page 1
    - **"rapid typing shows results for the final query"** (type "or", "ort", "orte" quickly; every visible name contains "orte")
    - `?page=999` clamps to the last page
  - **`contact-form.spec.ts`:** empty submit gives the summary and focus; fill and save lands on the detail page with the toast; edit summary and save.
  - **`detail.spec.ts`:** add a note, then it appears in the notes and the timeline ("Alex Morgan added a note"); Reschedule updates the pill.
  - **`pipeline.spec.ts`:** moving a Lead card to Active moves it with the toast; after a reload the state persists; "Show 50 more" appends 50 cards.
  - **`viewer.spec.ts`:** Edit and Move are `aria-disabled` with tooltip text; the composer is replaced; there's no New contact button; `/contacts/new` shows "You can't add contacts".
  - **`mobile.spec.ts` (`@mobile`):** the tab bar is visible; the cards render; the Filters sheet opens, traps focus and closes on Esc.
  - **`a11y.spec.ts`:** axe has **no serious or critical violations** on `/login`, `/contacts`, `/contacts/[id]`, `/contacts/new`, `/contacts/[id]/edit` and `/pipeline`, as both Admin and Viewer.
  - **`smoke.spec.ts`:** the Viewer signs in on `BASE_URL` and the contacts table has rows. It's read-only.
- [ ] **Step 2: Run** `pnpm e2e`. Expected: FAIL (fake data, stubbed actions).
- [ ] **Step 3: Wire it up.** Switch `lib/data/index.ts`, pass the real actions into the components, use the real `getViewer` in the layout, delete `fake.ts`, and run `pnpm db:types`.
- [ ] **Step 4: Run** `pnpm test && pnpm test:integration && pnpm e2e`. Expected: all PASS, including the axe checks.
- [ ] **Step 5: Commit** in two parts: the specs (`"Add end-to-end and accessibility specs"`), then `"Wire Supabase data layer and Server Actions into the screens"`. Merge with a merge commit.

### Task 23: First production deploy

- [ ] **Step 1:** Merge to `main`. Expected: `deploy.yml` runs migrate, then deploy, then the smoke test, and passes. Record the production URL.
- [ ] **Step 2:** Run `gh workflow run seed.yml` if the data isn't already seeded. Sign in manually as both roles on the live URL, at 1440px and on a real phone.
- [ ] **Step 3:** Check Supabase Auth's rate-limit settings, and that sign-ups are disabled (a sign-up call with the publishable key must fail).

### Task 24: Hardening and design audit

- [ ] **Step 1: Run Impeccable's detector on every screen.** `"$IMPECCABLE/scripts/impeccable" detect --json app features components`, where `IMPECCABLE=~/.claude/plugins/marketplaces/impeccable/plugin/skills/impeccable`. Fix every real finding. Record false positives in `.impeccable/critique/ignore.md`.
- [ ] **Step 2: Polish and audit.** Run Impeccable's `polish` on each screen and its `audit` once, using `reference/polish.md` and `reference/audit.md`. Fix P0 and P1 findings.
- [ ] **Step 3: Manual pass, checking each Review Focus item and the §8.9 edge cases:**
  - VoiceOver: list, filters, form errors, move menu, toasts
  - a 320px width and 200% zoom
  - `forced-colors`
  - `prefers-reduced-motion`
- [ ] **Step 4: Lighthouse** (mobile) on production `/contacts`. Expected: Performance ≥ 90 and Accessibility ≥ 95. Check the `/contacts` route JS with `next build` output is under 180kB gzipped. Fix any regressions.
- [ ] **Step 5: Commit** each fix separately with its own message. Merge.

### Task 25: README and submission

**Files:**
- Create: `README.md` (at most one page; follow spec §13 exactly, including the RBAC section, the demo accounts with credentials, the trade-offs, future work, how AI was used, and the operator note)

- [ ] **Step 1: Write the README.** Check it fits one page when rendered on GitHub.
- [ ] **Step 2: Make the repo public and protect `main`.** `gh repo edit --visibility public --accept-visibility-change-consequences`, then enable branch protection on `main` with the required checks `checks` and `integration-e2e`.
- [ ] **Step 3: Final checklist.**
  - The live link works signed out and signed in, for both roles.
  - The history is meaningful (`git log --oneline | wc -l` is more than 30, with no squashes).
  - The ADR statuses have been reviewed by Khubaib.
- [ ] **Step 4: Commit** `"Add README"`. Push. Hand the live URL and repo URL to Khubaib.

### Stretch

- **S1 Dark mode.** Add a second token set under `[data-theme="dark"]` with the spec §8.13 dark values, re-checking every pair for 4.5:1 contrast. Add a theme switch in `AccountBlock` (System / Light / Dark) stored in a cookie and read by the root layout, so there's no flash. Add an e2e check that axe passes in dark mode. Add Lighthouse CI against production as a non-blocking job.
- **S2 Attorney role and staging previews.** Add an `attorney` role (read and write, but no delete) through a seed change, and a seeded account. Add a staging Supabase project plus a preview job in `deploy.yml` for PRs.
