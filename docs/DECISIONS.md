# Decisions

Settled in the spec interview on 2026-11-16. Khubaib decides; Claude proposes. Architectural decisions link to an ADR in [adr/](adr/), and everything else is recorded here. A row marked *(Claude's call)* is a default that Claude proposed and Khubaib didn't object to.

| # | Decision | ADR | Why |
|---|---|---|---|
| 1 | Supabase backend, with a daily keep-alive cron | [0001](adr/0001-backend-supabase.md) | Real persistence and a real backend. The 7-day idle pause is mitigated and documented. |
| 2 | Next.js App Router: RSC reads, Server Actions writes | [0002](adr/0002-rendering-rsc-server-actions.md) | httpOnly session, server-side validation, fits confidential legal data |
| 3 | Pre-seeded accounts per role (Admin, Viewer), email and password form only, sign-ups disabled, one shared firm workspace | [0003](adr/0003-auth-and-rbac.md) | Makes RBAC real and demonstrable; removes every self-sign-up abuse vector |
| 4 | No intro dialog; demo limitations live in the README only | — | The reasons for the dialog went away with the new auth model |
| 5 | Supabase sign-in rate limits with the client IP forwarded (`Sb-Forwarded-For`) | [0004](adr/0004-abuse-limits.md) | Sign-in is the only public surface now; limits apply per reviewer |
| 6 | The operator re-runs the idempotent `seed` workflow to restore accounts or data; no in-app reset and no nightly reset | [0003](adr/0003-auth-and-rbac.md) | Saves time; documented |
| 7 | Pipeline uses a "Move to…" menu only; drag and drop is future work | [0005](adr/0005-pipeline-move-menu.md) | Simplicity; WCAG 2.5.7 needs a non-drag path anyway |
| 8 | Board ordered by urgency, with no manual ordering *(Claude's call)* | [0005](adr/0005-pipeline-move-menu.md) | Intake cares who needs a call today |
| 9 | About 2,500 seeded contacts per workspace; server pagination (default 250, options 25–500); virtualized | [0006](adr/0006-list-pagination-virtualization.md) | Realistic volume; the Ctrl+F trade-off is stated |
| 10 | List and facets come from SQL RPCs that share one predicate | [0007](adr/0007-query-layer-rpcs.md) | Counts can never contradict the list |
| 11 | Partial-match search (trigram) | [0007](adr/0007-query-layer-rpcs.md) | "sar" finds Sarah |
| 12 | Filters in a right-hand panel: floats on desktop, sheet on mobile; draft with Apply (which closes) and Cancel; Clear all resets the draft; chips act immediately | — | User choice; no reflow when toggled; same experience across devices |
| 13 | Facet counts reflect the applied filters only; live draft counts are future work | — | Demo scope |
| 14 | Deploys via GitHub Actions on `main`: migrate, then deploy, then smoke test. No PR previews (a known gap; a staging project is future work) | [0008](adr/0008-deploy-pipeline.md) | Guaranteed ordering; previews against production would break on migrations |
| 15 | Radix styled by us, Tailwind 4 tokens, Lucide, sonner, RHF + Zod, nuqs, TanStack Table + Virtual, date-fns + react-day-picker | [0009](adr/0009-ui-foundation.md) | Accessible primitives without the generic look |
| 16 | CSS-only transitions; `motion` is a stated trade-off | — | Simplicity and the deadline |
| 17 | Time-zone-aware "today" via a validated `tz` cookie; dates move as `YYYY-MM-DD` | [0010](adr/0010-dates-and-timezones.md) | Correct overdue/today labels and validation in every zone |
| 18 | Visual direction C v5: sage, Figtree, 36px rows, neutral status pills, warm colours only for urgency, left nav, bottom tab bar on mobile | — | Picked by Khubaib; refined through an Impeccable critique |
| 19 | Product name Caseflow; voice "crisp power-tool"; both user types are equal primary users | — | Impeccable init interview |
| 20 | Forms are full pages, not modals *(Claude's call)* | — | Own URL, back button, works on mobile |
| 21 | Each pipeline column loads 50 cards with "Show 50 more" *(Claude's call)* | — | Thousands of contacts per column |
| 22 | ~~Soft delete with Undo~~ (delete is out of scope, see 29); edit conflict detection via `updated_at` *(Claude's call)* | — | Never lose work; reviewers share the firm workspace |
| 23 | RBAC in v1 with two roles: Admin (full) and Viewer (read-only). Four layers (proxy for sign-in only, server `requirePermission`, Postgres RLS trusted, client `usePermission`). Role read from `profiles`. Viewer UI: write actions disabled with a reason, entry points hidden, forbidden page on write URLs | [0003](adr/0003-auth-and-rbac.md) | Demonstrates RBAC end to end without the cost of more roles |
| 25 | Supabase free plan; one firm workspace of about 2.5k contacts (about 3MB); no trigram indexes *(Claude's call)* | [0001](adr/0001-backend-supabase.md) | Stays far below the 500MB limit |
| 26 | Repo private during development, public at submission, with branch protection enabled then | — | GitHub Free only enforces protection on public repos |
| 24 | Global search, keyboard shortcuts, drag and drop and live draft counts are future enhancements | — | Functional deliverables first |

| 27 | No demo or simulation controls; presented as a fully functional app | — | Khubaib's call: the app should be judged as it is |
| 28 | Light mode only in v1; tokens ready for theming; dark mode is stretch S1 | — | Nice-to-have; functional deliverables first |
| 29 | Contact delete, Undo and restore are out of scope for v1: no UI, no RPCs. The `deleted_at` column and its guard stay. Pipeline paging stays "Show 50 more" with no virtualization, and moves use the "Move to…" menu on desktop and mobile (no drag and drop) | [0005](adr/0005-pipeline-move-menu.md) | Khubaib's call, 2026-11-17: no extra backend features the BRIEF doesn't require |
| 30 | First-load JS budget raised from 180 kB to 220 kB gzipped per route (`/contacts` and the shell routes), enforced by `pnpm size` in CI. Below-the-fold pieces stay lazy | — | Khubaib's call, 2026-11-17: the Next 16.4 framework baseline is about 131.5 kB gzipped before any app code, which left about 48 kB for the whole app |
| 31 | Notes composer is capped at `max-w-2xl` (672px), left-aligned, and the note list shares that measure. An admin with no notes sees the composer only; viewers still see "No notes yet." | — | Khubaib's call, 2026-11-17: [`profile-notes-v1.html`](../design/mockups/profile-notes-v1.html) |
| 32 | Sidebar account is one menu button: "Name · Role" row from lg, a 32px initials avatar with a shield or lock badge on the rail; the menu holds the full name, role and Sign out. No separate sign-out control | — | Khubaib approved options B and X, 2026-11-17 (`design/mockups/profile-notes-v1.html`) |
