# Caseflow

A legal-intake mini CRM. Track every prospective client, a **contact**, from first enquiry to retained or closed, so no follow-up is missed. Each contact carries a matter, a referral source and a next follow-up date, and moves through **Lead, Active and Closed**. Overdue follow-ups come first.

**Live:** <LIVE_URL>

**Demo access:** two accounts, an **Admin** (full access) and a read-only **Viewer**. Credentials are in the submission message, not in this repo.

## Features

- **Contact list:** fast search, filters with live counts (Apply step), urgency sort, paging, shareable URLs. Virtualized table on desktop, cards on phones.
- **Contact detail:** timeline, reschedule, move, and rich-text notes (bold, italic, lists, links).
- **Contact form:** inline validation, a draft that survives session expiry, and conflict handling (a stale save is refused and offers Reload latest).
- **Pipeline:** Lead, Active and Closed columns ordered by urgency, with **Move to…**.
- **RBAC:** Admin writes, Viewer reads. Disabled controls say why.
- **States:** loading, empty, filtered-empty, error, 404 and 403 on every screen.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix, TanStack Table and Virtual, React Hook Form, Zod 4, nuqs, Tiptap, Supabase (Postgres, Auth, RLS), Vitest, Playwright with axe. Deployed to Vercel from GitHub Actions.

## Architecture

Layers run `app -> features -> components -> lib -> utils`; nothing imports upward.

- **Reads:** Server Components call RPCs through `lib/data`. The URL is the list state.
- **Writes:** Server Actions. Each checks permission, validates with Zod, writes, then revalidates. Zod contracts are shared by browser and server.
- **Enforcement:** Postgres RLS is the real boundary. The proxy, server checks and `usePermission` only shape the experience.
- **Security:** nonce-based CSP with `strict-dynamic`, HttpOnly SameSite session cookies, HSTS, `nosniff`, no framing. Notes render from an allowlisted JSON document, never raw HTML.

**State management.** Server data lives on the server: no client cache, no global store. List and pipeline state (search, filters, sort, page) lives in the URL via `nuqs`, so views are shareable and Back works. Moves use `useOptimistic` with rollback. Forms use React Hook Form with the same Zod schema the Server Action runs. Local UI state stays in the component that owns it.

## UI/UX decisions

- **Urgency first.** Default sort is overdue, due today, soonest follow-up, then none. Warm colour is reserved for urgency, so it never competes with status.
- **Dense, calm, power-tool.** Compact rows, one accent, no decoration. Built for a coordinator working a queue all day.
- **Filters draft, then Apply.** Counts show what each choice would return, and the list doesn't jump while you build a query.
- **A menu instead of dragging.** Keyboard and screen-reader friendly, and it works on phones.
- **Every state is designed.** Loading, empty, filtered-empty, error, 404 and 403 each say what happened and what to do next.

## Run locally

Needs Node 24, pnpm 10, Docker and the Supabase CLI.

```sh
pnpm install
cp .env.example .env.local   # fill from the output of `supabase start`
supabase start
pnpm seed                    # demo accounts + 2,500 contacts (idempotent)
pnpm dev
```

## Tests and CI/CD

- `pnpm test`: unit. `pnpm test:integration`: RBAC suite against the local stack. `pnpm e2e`: Playwright journeys plus axe accessibility and CSP-violation checks.
- **CI** on every PR: format, typecheck, lint (colour-literal check), unit, build, bundle size, integration and e2e on a local Supabase, secret scan.
- **Deploy** on `main` after CI: `supabase db push`, then `vercel build` and `deploy`, then a smoke test on the live URL. A stale-SHA guard skips any run whose commit is no longer the tip of `main`, so an old run never overwrites a newer deploy.

## Decisions and trade-offs

Full records in [`docs/adr/`](docs/adr/README.md). Detailed setup, deploy and security notes: [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

- **No drag and drop.** A menu moves cards instead; dragging alone fails WCAG 2.2 SC 2.5.7. Cards are urgency-ordered, so there is no manual order to drag. [ADR-0005](docs/adr/0005-pipeline-move-menu.md)
- **Button paging.** Server pages with an explicit control, "Show 50 more" on the board, rather than infinite scroll. [ADR-0006](docs/adr/0006-list-pagination-virtualization.md)
- **Per-IP sign-in throttle only.** Supabase limits by IP, with no per-account lockout, so seeded passwords are strong. [ADR-0004](docs/adr/0004-abuse-limits.md)
- **`style-src 'unsafe-inline'`.** Radix and sonner inject styles with no nonce hook, and React `style` attributes cannot take one. Scripts stay strict.
- **Last write wins for moves in v1.** Edits are version-checked; moves and reschedules are not. [ADR-0011](docs/adr/0011-concurrent-edits-and-change-feed.md)
- **Rendering and data:** RSC plus Server Actions ([0002](docs/adr/0002-rendering-rsc-server-actions.md)), RLS-backed RBAC ([0003](docs/adr/0003-auth-and-rbac.md)), two query RPCs ([0007](docs/adr/0007-query-layer-rpcs.md)), date-only strings in the user's time zone ([0010](docs/adr/0010-dates-and-timezones.md)).

## With more time

- **Real-time concurrency (T22d, ADR-0011):** a version check on every write, plus a Server-Sent Events change feed fed by Postgres `LISTEN`, so open screens update and nobody silently overwrites a move. Deferred for the deadline.
- Undo for moves.
- Keyboard shortcuts and global search.
- A CSP report endpoint.
- Product analytics and real-user monitoring (Core Web Vitals per route), plus exception tracking and alerting, with Sentry or one tool such as PostHog covering both. Server Actions and error boundaries would report there.
- More roles, sign-up and invites, password reset, MFA and SSO.
- A staging project with PR previews, and a nightly demo reset.

## How AI was used

Claude Code did the implementation. I made every product and design decision.

- **Spec first.** An interview produced `docs/SPEC.md`, the ADRs and a task plan before any code.
- **Parallel subagents.** Separate git worktrees, one small PR per task. The failing test came first on critical paths.
- **Review on every PR.** A fresh-agent code review and an Impeccable design critique ran on every PR. Visual changes went to a mockup for my approval first.
- **Decisions stayed human.** Every fork came back to me, and the rulings are recorded in the SPEC, PLAN and ADRs. I review and can explain every line.

## Quality bar

WCAG 2.2 AA. Measured locally on `/contacts` (mobile): Lighthouse Performance 100, Accessibility 100, CLS 0. First-load JS under 220 kB gzipped, enforced in CI.
