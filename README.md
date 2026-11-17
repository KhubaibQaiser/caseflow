# Caseflow

A legal-intake mini CRM. Track every prospective client, a **contact**, from first enquiry to retained or closed, so no follow-up is missed. Each contact has a matter, a referral source and a next follow-up date, and moves through **Lead, Active and Closed**. Overdue follow-ups come first.

**Live:** [caseflow-drab.vercel.app](https://caseflow-drab.vercel.app) · **Demo access:** an **Admin** (full access) and a read-only **Viewer**. Credentials are in the submission message.

**What's in it:** a contact list with search, filters with live counts, urgency sort and paging. Contact detail with a timeline, reschedule and rich-text notes. Create and edit forms with validation, conflict handling and phone numbers formatted by country. A pipeline with **Move to…** and a sort per column (urgency, name, recently updated, newest). Two roles, with disabled controls that say why. Loading, empty, error, 404 and 403 states on every screen. Light and dark themes, System by default, remembered per device. On phones the pager stays pinned and the header slides away as you scroll.

## Component structure and state

- **Layers run `app → features → components → lib → utils`,** and nothing imports upward.
  - `app/` holds routes and boundaries.
  - `features/<domain>` (contacts, pipeline, auth) owns screens and their client logic.
  - `components/ui` holds the shared primitives.
  - `lib/` holds data access, contracts, auth and dates.
- **Reads** are Server Components calling two Postgres RPCs. **Writes** are Server Actions: check permission, validate with Zod, write, revalidate. Postgres RLS is the real permission boundary; the UI only reflects it.
- **State:** server data stays on the server, with no client cache or global store.
  - List and pipeline state (search, filters, sort, page) lives in the URL via `nuqs`, so views are shareable and Back works.
  - Moves use `useOptimistic` with rollback.
  - Forms use React Hook Form with the same Zod schema the Server Action runs.

## UI/UX decisions

- **Urgency first.** The default sort is overdue, due today, soonest follow-up, then none. Warm colour is reserved for urgency.
- **Dense and calm.** Compact rows, one accent, no decoration, for a coordinator working a queue all day.
- **Filters draft, then Apply.** Counts show what each choice returns, and the list doesn't jump while you build a query.
- **Every state is designed.** Each one says what happened and what to do next.

## Trade-off

**A Move menu instead of drag and drop.** Dragging alone fails WCAG 2.2 (2.5.7). It's awkward on phones and with a keyboard. Cards are ordered by urgency, so there's no manual order to drag into. The cost is one extra click for mouse users. Other decisions are in [`docs/adr/`](docs/adr/README.md).

**Phone migration assumptions:** existing bare 10-digit numbers became US (+1), and text around a number such as "(cell)" was dropped. Safe for the all-US data it ran on.

## With more time

- **Real-time concurrency.** Edits are already version-checked. Next: version-check moves too, and stream changes over Server-Sent Events (Postgres `LISTEN`), so open screens update live ([ADR-0011](docs/adr/0011-concurrent-edits-and-change-feed.md)).
- Undo for moves, keyboard shortcuts and global search.
- Product analytics, real-user monitoring and error tracking (Sentry or PostHog).
- More roles, invites and password reset, and a staging project with PR previews.

## How AI was used

Claude Code wrote the code. I made every product and design decision.

- **Spec first.** An interview produced the spec, the ADRs and a task plan before any code.
- **Small PRs.** Parallel subagents in separate git worktrees built one small PR per task, with failing tests first on critical paths.
- **Reviews.** A fresh code review and a design critique ran on every PR. Visual changes went to a mockup for my approval first.
- **Ownership.** Every fork came back to me. I review and can explain every line.

**Quality:** WCAG 2.2 AA, with axe checks in the e2e suite. Lighthouse on mobile `/contacts`: Performance 100, Accessibility 100, CLS 0 (measured locally). The first-load JS budget is 220 kB, enforced in CI. Loading skeletons are real tables and forms, and an e2e test checks every column and control against the loaded page to within 1px.

**Setup, tests, CI/CD and security notes:** [`docs/RUNBOOK.md`](docs/RUNBOOK.md).
