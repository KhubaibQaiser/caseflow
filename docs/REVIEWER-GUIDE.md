# Reviewer guide

The README is the one-page summary the brief asks for. This page is for the reviewer who wants to go further: what to try, why it is built this way, and where to look in the code.

## 1. A 10-minute tour

Open [caseflow-drab.vercel.app](https://caseflow-drab.vercel.app) and sign in as **Admin** (credentials are in the submission message).

1. **Contacts list.** Note the order: overdue first, then due today, then soonest. Type in search, open **Filters**, and watch the counts beside each option update before you apply. Change page size and sort, then copy the URL into a new tab: you get the same view.
2. **A contact.** Open any row. Reschedule the follow-up, add a rich-text note (Cmd/Ctrl+Enter saves), and see both land in the activity timeline.
3. **Create and edit.** Submit **New contact** empty to see every error at once, with focus on the first. Name, matter, and an email or phone are required. Pick a country on the phone field: the number formats as you type.
4. **Pipeline.** Use **Move to…** on a card, with the mouse or by keyboard (Tab to the button, Enter, arrows). The card moves immediately and rolls back with a toast if the save fails. Each column has its own sort.
5. **Viewer.** Sign out and sign in as **Viewer**. Everything is readable; every write control is disabled and says why. The database refuses those writes too, not just the UI.
6. **States.** Try a phone width (375px), dark mode (the toggle is top right), a URL like `/contacts/does-not-exist`, and a slow network: skeletons match the loaded layout, so nothing shifts.

## 2. Architecture, and why

| Decision | Why | ADR |
|---|---|---|
| **Next.js 16 App Router: Server Components read, Server Actions write** | Data never needs a client cache or API layer. Pages render with data on first paint, and writes revalidate the exact routes they affect. | [0002](adr/0002-rendering-rsc-server-actions.md) |
| **Supabase (Postgres, Auth, RLS)** | Real persistence and real auth for free, and permissions enforced in the database, so a bug in the UI can't leak a write. | [0001](adr/0001-backend-supabase.md), [0003](adr/0003-auth-and-rbac.md) |
| **Two RPCs share one filter predicate** | `search_contacts` returns a page; `contact_facets` returns the counts for the same filters. Sharing the predicate means the counts can never disagree with the list. | [0007](adr/0007-query-layer-rpcs.md) |
| **Server pagination, virtualized rows** | Default 250 rows per page stays smooth with TanStack Virtual, on the table and on the phone card list (ADR-0013). Off-screen rows are not in the page, which search and filters offset. | [0006](adr/0006-list-pagination-virtualization.md) |
| **URL is the state** (`nuqs`) | Shareable views, working Back button, nothing to sync. | [0009](adr/0009-ui-foundation.md) |
| **Dates as `YYYY-MM-DD` in the user's time zone** | "Due today" must mean today where the coordinator sits, not in UTC. | [0010](adr/0010-dates-and-timezones.md) |
| **Deploy from GitHub Actions in order** | Migrate, then build and deploy, then a smoke test against production, only after CI is green. | [0008](adr/0008-deploy-pipeline.md) |

All ADRs list at least three options considered: [docs/adr](adr/README.md).

## 3. Backend

- **Schema:** contacts, notes, activities and profiles (role per user), in [`supabase/migrations`](../supabase/migrations).
- **Triggers** write the activity timeline and audit fields, so every write path records history the same way, including direct SQL.
- **RLS policies** let Viewers read and Admins write; integration tests in [`tests/integration`](../tests/integration) prove it against a real local stack.
- **Edits are version-checked:** saving over someone else's newer edit shows a conflict banner instead of silently overwriting.
- **Phones are stored as E.164** and shown in national format.
- **Security:** nonce-based CSP, HSTS, framing denied, rate-limited sign-in, Zod on every Server Action and RPC response.

## 4. Frontend

- **Where to start reading:** [`features/contacts/list`](../features/contacts/list) (list, filters, URL state), [`features/pipeline`](../features/pipeline) (optimistic moves), [`features/contacts/form`](../features/contacts/form) (one Zod schema for client and server), [`components/ui`](../components/ui) (primitives).
- **Design system:** Tailwind 4 with tokens only in [`app/globals.css`](../app/globals.css); a lint check rejects colour literals anywhere else. Light and dark are two token sets.
- **Accessibility:** WCAG 2.2 AA. Radix handles focus and menus, axe runs on every route in e2e, 24px minimum targets, visible focus, and nothing is conveyed by colour alone.
- **Performance:** first-load JS for `/contacts` is held under 220 kB in CI. Heavy pieces (rich-text editor, phone metadata, menus) load on demand.
- **Mobile:** cards instead of the table, a pinned pager, a header that slides away on scroll, pipeline as tabs.

## 5. Why no drag and drop (yet)

Drag-only interaction fails WCAG 2.2 success criterion 2.5.7, doesn't work by keyboard, and is fiddly on touch. The board is sorted by urgency, so a drop position would mean nothing. The **Move to…** menu covers mouse, keyboard, touch and screen readers with one control.

Drag and drop on desktop is a good *addition* rather than a replacement: with more time I'd add it (dnd-kit, with its keyboard sensor and live announcements) as a shortcut on top of the menu, so the accessible path stays.

## 6. One reviewer versus many users

The demo is tuned for a few reviewers at once. Here is what holds today and what changes at scale.

**What already works with several people**

- **Shared, persistent data.** Everyone works on the same Postgres database, so one reviewer's change is visible to the others on their next navigation or refresh.
- **Edit conflicts are caught.** The edit form sends the `updated_at` it loaded. If someone saved in between, the save is refused with "This contact was changed since you opened it." and your input is kept, so nobody silently overwrites a colleague.
- **Permissions hold under load.** Roles are enforced by RLS in the database, not by the UI, so any number of Admins and Viewers get the same guarantees.
- **Sign-in limits are per person.** The server forwards each reviewer's IP to Supabase, so one reviewer's failed attempts don't lock out another (ADR-0004). Public sign-up is off: nobody can create accounts.
- **The list scales with the data.** Paging, filtering and counting happen in Postgres (indexed on status and follow-up date, updated and created dates), and the browser renders only visible rows.

**Known limits, deliberately left for later**

- **No live updates.** Open screens don't refresh when someone else changes data; you see it on the next navigation. Two reviewers on the same board can see different states for a moment.
- **Pipeline moves are last-write-wins.** Unlike edits, a move doesn't check the version, so two simultaneous moves of the same card both succeed and the later one stands. Each is recorded in the timeline, so nothing is lost silently.
- **Shared demo accounts.** All reviewers share one Admin and one Viewer, so the timeline can't tell two reviewers apart. Re-running the seed resets the data for everyone.
- **Search is a simple match,** which is fine at thousands of contacts but would want a trigram or full-text index at hundreds of thousands.
- **Free-tier infrastructure:** Supabase free tier and Vercel Hobby, with no read replicas or connection pooling tuning.

**How it would grow** ([ADR-0011](adr/0011-concurrent-edits-and-change-feed.md), accepted, not built in v1)

1. Version-check moves the same way edits are checked, with a clear "moved by someone else" message.
2. A change feed: a trigger writes each change to a log, Postgres `LISTEN` picks it up, and the server streams it to open screens over Server-Sent Events, so lists and boards update live.
3. One account per person (invites) so the timeline shows who did what, with roles per user rather than shared logins.
4. Full-text search indexes, connection pooling, and error tracking with real-user monitoring before real traffic.

## 7. Future enhancements

1. Drag and drop on desktop, keyboard shortcuts (j/k, quick status change) and a command palette.
2. Live collaboration: version-checked moves and a Postgres `LISTEN` change feed streamed over SSE, so open screens update without refresh ([ADR-0011](adr/0011-concurrent-edits-and-change-feed.md), accepted, not built in v1).
3. Undo for moves, global search across notes.
4. Invites, password reset, more granular roles.
5. Error tracking, real-user monitoring and product analytics; PR preview environments with a staging database.

## 8. Run it locally

Node 24, pnpm 10, Docker and the Supabase CLI. Full steps in [RUNBOOK.md](RUNBOOK.md); the short version:

```sh
pnpm install
supabase start
cp .env.example .env.local   # values from `supabase start`, plus seed passwords you choose
pnpm seed
pnpm dev
```

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`, `pnpm e2e`.

## 9. Process

Every change was a small PR with a fresh review, merged with a merge commit (no squashing), so the history reads as the build log. The spec ([SPEC.md](SPEC.md)), plan ([PLAN.md](PLAN.md)) and decision log ([DECISIONS.md](DECISIONS.md)) were written before the code and kept current with every ruling.
