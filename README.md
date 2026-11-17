# Caseflow

A client-intake CRM for a law firm. Each prospective client is a **contact** with a matter, a referral source and a next follow-up date, moving through **Lead → Active → Closed**. The whole app answers one question for the intake coordinator: _who do I call next?_ Overdue follow-ups always come first.

**Live:** [caseflow-drab.vercel.app](https://caseflow-drab.vercel.app) · Sign in as **Admin** (full access) or **Viewer** (read-only). Credentials are in the submission message. 2,500 seeded contacts, dated relative to today.

**Reviewing in 10 minutes:** [`docs/REVIEWER-GUIDE.md`](docs/REVIEWER-GUIDE.md) has a guided tour, the architecture and why, and where to look in the code.

## Screens

<details open>
<summary><b>Light</b>: every screen at desktop and mobile width</summary>

| Screen         | Desktop (1440)                                                                                                                                                                 | Mobile (375)                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in        | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/1-login-1440-light.png" width="480" alt="Sign in, desktop, light">           | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/1-login-375-light.png" width="160" alt="Sign in, mobile, light">           |
| Contacts list  | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/2-contacts-1440-light.png" width="480" alt="Contacts list, desktop, light">  | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/2-contacts-375-light.png" width="160" alt="Contacts list, mobile, light">  |
| Filters        | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/3-filters-1440-light.png" width="480" alt="Filters, desktop, light">         | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/3-filters-375-light.png" width="160" alt="Filters, mobile, light">         |
| Contact detail | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/4-detail-1440-light.png" width="480" alt="Contact detail, desktop, light">   | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/4-detail-375-light.png" width="160" alt="Contact detail, mobile, light">   |
| New contact    | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/5-new-contact-1440-light.png" width="480" alt="New contact, desktop, light"> | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/5-new-contact-375-light.png" width="160" alt="New contact, mobile, light"> |
| Pipeline       | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/6-pipeline-1440-light.png" width="480" alt="Pipeline, desktop, light">       | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/6-pipeline-375-light.png" width="160" alt="Pipeline, mobile, light">       |

</details>

<details>
<summary><b>Dark</b></summary>

| Screen         | Desktop (1440)                                                                                                                                                               | Mobile (375)                                                                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in        | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/1-login-1440-dark.png" width="480" alt="Sign in, desktop, dark">           | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/1-login-375-dark.png" width="160" alt="Sign in, mobile, dark">           |
| Contacts list  | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/2-contacts-1440-dark.png" width="480" alt="Contacts list, desktop, dark">  | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/2-contacts-375-dark.png" width="160" alt="Contacts list, mobile, dark">  |
| Filters        | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/3-filters-1440-dark.png" width="480" alt="Filters, desktop, dark">         | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/3-filters-375-dark.png" width="160" alt="Filters, mobile, dark">         |
| Contact detail | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/4-detail-1440-dark.png" width="480" alt="Contact detail, desktop, dark">   | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/4-detail-375-dark.png" width="160" alt="Contact detail, mobile, dark">   |
| New contact    | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/5-new-contact-1440-dark.png" width="480" alt="New contact, desktop, dark"> | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/5-new-contact-375-dark.png" width="160" alt="New contact, mobile, dark"> |
| Pipeline       | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/6-pipeline-1440-dark.png" width="480" alt="Pipeline, desktop, dark">       | <img src="https://raw.githubusercontent.com/KhubaibQaiser/caseflow/screenshots/screenshots/readme/6-pipeline-375-dark.png" width="160" alt="Pipeline, mobile, dark">       |

</details>

## Component structure and state

- **Layers:** `app → features → components → lib → utils`; nothing imports upward. `app/` holds routes and boundaries, `features/<domain>` owns screens (contacts, pipeline, auth), `components/ui` holds shared primitives on Radix, and `lib/` holds data access, Zod contracts, auth and dates.
- **Server owns data.** Reads are Server Components calling two Postgres RPCs. Writes are Server Actions: permission check, Zod validation, write, revalidate. Postgres row-level security is the real permission boundary; the UI only mirrors it.
- **No client store.** Search, filters, sort and page live in the URL (`nuqs`), so every view is shareable and Back works. Pipeline moves use `useOptimistic` with rollback. Forms use React Hook Form with the same Zod schema the server runs.

## UI/UX decisions

- **Urgency first.** Default sort: overdue, due today, soonest follow-up, none. Warm colour is reserved for urgency, and it is always written as text too.
- **Dense and calm.** 36px rows, one accent, no decoration, built for someone working a queue all day. Light and dark themes, System by default.
- **Filters draft, then apply,** with live counts per option, so the list never jumps mid-query. Search clears with × or Esc.
- **One account menu.** The sidebar ends in "Name · Role" (an initials avatar on the tablet rail) that opens a menu with Sign out.
- **Every state is designed:** skeletons that match the loaded layout (also while a filter, sort or page reloads), filtered and first-run empty states, errors with Retry, 404 and 403. Viewers see disabled controls that say why.

## Trade-offs

**A Move menu instead of drag and drop.** Dragging alone fails WCAG 2.2 (2.5.7), is clumsy on phones and impossible by keyboard. Cards are ordered by urgency, so there is no manual order to drag into. Every card has a keyboard-accessible **Move to…** menu instead. The cost is one extra click for mouse users; drag and drop on desktop, as a shortcut on top of the menu, is the first thing I would add.

**No live updates on the pipeline yet.** A shared board should show other people's changes as they happen. Given the deadline, data refreshes on load and after each action. The production design ([ADR-0011](docs/adr/0011-concurrent-edits-and-change-feed.md)) streams changes since a cursor over SSE, and one client function merges each one: it removes the card, re-inserts it at its sorted position and takes counts from the server. Cards stay correct even in columns paged past the first 50, and the same function can sit behind a plain poll first.

## With more time

- Drag and drop on desktop, keyboard shortcuts (j/k rows, quick status change) and a command palette.
- **Scale and concurrency.** Today edits are version-checked (a stale save is refused, input kept), roles are enforced in Postgres, and paging and counts run in the database. Moves are last-write-wins. Next: version-checked moves, the SSE change feed above, and one account per person. Details in the [reviewer guide](docs/REVIEWER-GUIDE.md#6-one-reviewer-versus-many-users).
- Undo for moves, global search, invites and password reset, more roles.
- Error tracking and analytics (Sentry or PostHog), and PR preview environments.

## How I used AI

Claude Code wrote the code; I made every product and design decision and can explain every line. An interview produced the spec, ADRs and a task plan before any code. Subagents in separate git worktrees built one small PR per task, failing tests first. Every PR got a fresh code review, and every visual change went to a mockup for my approval before it was coded.

**Quality:** WCAG 2.2 AA with axe in e2e · 220 kB JS budget enforced in CI · 600+ unit and 120+ e2e tests · an e2e test checks every skeleton against the loaded page to within 1px, including while the form's code is still downloading. Setup and operations: [`docs/RUNBOOK.md`](docs/RUNBOOK.md).
