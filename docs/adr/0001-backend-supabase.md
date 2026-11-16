# ADR-0001 — Use Supabase as the backend

## Title

Use Supabase (Postgres, Auth, RLS) as the backend, kept awake by a daily GitHub Action

## Status

`proposed`

## Date

2026-11-16

## Context

Spec decision 1. Data must survive a refresh (G6) and the app must be live on Vercel (G7). The goals added in the interview need a real database: about 2,500 seeded contacts in one shared firm workspace with server-side pagination (G8), facet counts (G9), and Admin and Viewer accounts whose permissions are enforced in Postgres (G10). The deadline is 24 hours and the backend must not become the focus. The Supabase free tier pauses a project after 7 days of low activity, and a live link that is down when reviewed is an anti-goal. When reviewers will open the link is unknown.

## Options considered

### Option 1 — Supabase (chosen)

- **Pros:** Postgres, Auth and row-level security in one hosted service. RLS policies call `has_permission()`, so what each role can do is enforced by the database. Schema, triggers, RPCs and the seed function are SQL migrations that also run on a local Supabase for tests.
- **Cons:** The free tier pauses after 7 idle days, so a keep-alive job is needed. Some settings live in the Supabase dashboard rather than the repo (sign-ups off, IP forwarding on for auth rate limits).

### Option 2 — localStorage

- **Pros:** No server, no accounts, nothing to deploy or keep awake.
- **Cons:** Not a real backend. Data stays in one browser, so there is no shared firm workspace and no role a server could enforce (G10), and paging, filtering and counting 2,500 rows would all run in the browser (G8, G9).

### Option 3 — Neon with a custom API

- **Pros:** Hosted Postgres with the same SQL features.
- **Cons:** Auth, sessions and the API layer would be ours to write, an estimated 2–3 extra hours on a 24-hour deadline.

## Decision

Option 1. Chosen by Khubaib in the spec interview. Supabase gives a real backend with Postgres, Auth and RLS without the 2–3 hours a custom API on Neon would add, and a daily keep-alive GitHub Action stops the free tier from pausing it.

## Consequences

- One shared firm workspace. Every table has RLS enabled, and policies check `has_permission()` against the caller's role in `profiles` and `role_permissions` (spec §6).
- A scheduled GitHub Action runs a daily keep-alive query (§10).
- Khubaib provides the project and its keys, with sign-ups disabled and IP forwarding enabled for auth rate limits (§12).
- CI runs `supabase start` and `supabase db reset` in Docker (§10), so Docker is needed locally and in CI.
- Tests required by §9: integration tests against a local Supabase for the **RBAC policies** (a Viewer cannot write, even through the Supabase API directly; an Admin can), the seed being idempotent, and the activity triggers.
- README trade-off: the Supabase pause and the keep-alive job (§13).

## Rejected and why

- **Rejected: storing data in the browser with localStorage.** It is not a real backend. Data would live in one browser only, so the firm could not share one workspace, no role could be enforced anywhere a user could not edit, and paging, filtering and counting 2,500 contacts would all have to happen on the client.
- **Rejected: Neon Postgres with a custom API.** Neon would provide the same database, but authentication, sessions and the API layer would all have to be written by hand, which was estimated at two to three extra hours on a 24-hour deadline.

## Sources

- Supabase, Production Checklist (free-plan projects paused after 7 days of low activity) — https://supabase.com/docs/guides/platform/going-into-prod — read 2026-11-16
- Supabase, Row Level Security — https://supabase.com/docs/guides/database/postgres/row-level-security — read 2026-11-16
