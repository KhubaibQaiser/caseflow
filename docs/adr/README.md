# Architecture Decision Records

Index of every ADR in this repo. One row per record, newest at the bottom. Each ADR expands one or more rows of the decision table in [`../SPEC.md`](../SPEC.md) §4.

| #    | Title                                                                                        | Status   | Date       |
| ---- | -------------------------------------------------------------------------------------------- | -------- | ---------- |
| 0000 | [Template](0000-template.md)                                                                 | n/a      | 2026-11-16 |
| 0001 | [Use Supabase as the backend](0001-backend-supabase.md)                                      | accepted | 2026-11-16 |
| 0002 | [Read with Server Components, write with Server Actions](0002-rendering-rsc-server-actions.md) | accepted | 2026-11-16 |
| 0003 | [Sign in to pre-seeded role accounts, with RBAC in the database](0003-auth-and-rbac.md)       | accepted | 2026-11-16 |
| 0004 | [Limit sign-in abuse with Supabase's per-IP limits](0004-abuse-limits.md)                    | accepted | 2026-11-16 |
| 0005 | [Move pipeline cards with a menu, ordered by urgency](0005-pipeline-move-menu.md)            | accepted | 2026-11-16 |
| 0006 | [Paginate on the server and virtualize the rows](0006-list-pagination-virtualization.md)     | accepted | 2026-11-16 |
| 0007 | [Query contacts through two RPCs that share one predicate](0007-query-layer-rpcs.md)         | accepted | 2026-11-16 |
| 0008 | [Deploy from GitHub Actions in a fixed order](0008-deploy-pipeline.md)                       | accepted | 2026-11-16 |
| 0009 | [Build the UI on Radix, React Hook Form with Zod, and nuqs](0009-ui-foundation.md)           | accepted | 2026-11-16 |
| 0010 | [Handle follow-up dates in the user's time zone](0010-dates-and-timezones.md)                | accepted | 2026-11-16 |
| 0011 | [Handle concurrent edits with version checks and a server change feed](0011-concurrent-edits-and-change-feed.md) | proposed | 2026-11-17 |
| 0012 | [Theme: System default, per-device cookie, server-rendered data-theme](0012-theme-system-default-cookie.md) | proposed | 2026-11-17 |

## Conventions

- **Filename:** `NNNN-short-title.md`, zero-padded to four digits, kebab-case title.
- **Numbering:** sequential, never reused. A superseded ADR keeps its number and its file; it is not deleted or rewritten.
- **Status:** `proposed` → `accepted` | `rejected` | `superseded by ADR-NNNN`.
- **Who promotes:** only Khubaib moves an ADR from `proposed` to `accepted`. An agent writes it as `proposed` and stops.
- **Conflicts:** if a change conflicts with an `accepted` ADR, stop and name the conflict rather than working around it.
- **Three options, always.** An ADR with fewer than three options considered is not finished.
- **This index is part of the change.** Adding an ADR without adding its row here is incomplete work.

Spec decisions without an ADR (11, 16, 18, 19) are recorded in the spec's §4 table.
