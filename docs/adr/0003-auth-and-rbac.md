# ADR-0003 — Sign in to pre-seeded role accounts, with RBAC in the database

## Title

Use pre-seeded Admin and Viewer accounts with email and password login, one shared firm workspace, and roles and permissions stored in Postgres; recover by re-running the `seed` workflow

## Status

`proposed`

## Date

2026-11-16

## Context

Spec decisions 3, 5 and 20. The app needs RBAC with two seeded roles, Admin (full access) and Viewer (read-only), enforced in Postgres and on the server and reflected in the UI (G10). Login is an email and password form, and self sign-up, password reset and account management are non-goals. Reviewers arrive cold through a link and must reach a working app quickly (G7), and data must persist across refreshes and devices (G6). The firm works in one shared workspace of about 2,500 contacts (G8). Two follow-on questions: where the server reads a user's role from (decision 20), and how an operator fixes broken data or a broken account (decision 5). How many reviewers will sign in at the same time is unknown.

## Options considered

### Option 1 — Pre-seeded role accounts, password login, RBAC in the database (chosen)

- **Pros:** An idempotent seed script creates `admin@caseflow.test` and `viewer@caseflow.test` through the admin API, with passwords from environment variables, and upserts their `profiles` rows. Sign-ups are disabled in Supabase, so sign-in is the only public auth surface. Roles and permissions live in `profiles` and `role_permissions`, and `has_permission()` drives every RLS policy, so a Viewer token cannot write even through the Supabase API directly. Adding a role later is one seed change.
- **Cons:** Every reviewer signed in as the same role shares the same account and the same firm data, so one reviewer's edits are visible to the next. The passwords have to be published in the README. Optimistic concurrency is needed for edits, because two reviewers can change the same contact.

### Option 2 — Email-only login with HMAC-derived passwords and private per-email workspaces

- **Pros:** No password to share. The server derives each password from a secret, so the same email reaches the same private workspace from any browser.
- **Cons:** Each person owns their whole workspace, so there is no meaningful RBAC to show. Anyone can create a seeded workspace by typing a new email, which needs abuse controls for self-creation: a rate-limit rule, a workspace cap and a cleanup job.

### Option 3 — Anonymous sign-in

- **Pros:** No form at all.
- **Cons:** A new browser means a new anonymous user and new data. There is no stable identity to attach a role to.

## Decision

Option 1. Chosen by Khubaib in the spec interview. Pre-seeded accounts with roles in the database give a real Admin and Viewer to compare, enforced by Postgres, without the self-creation abuse controls that private per-email workspaces need.

Role source (decision 20), also chosen by Khubaib in the spec interview: the server reads the role from `profiles` on each request rather than from a JWT claim. A role change takes effect on the next request, and nothing has to be configured in the Supabase dashboard. Enforcement has four layers, and only Postgres is trusted: `proxy.ts` checks only that a session exists; `requirePermission` on the server renders the forbidden page or returns `forbidden`; Postgres RLS and triggers do the real enforcement; and the client `usePermission` only disables or hides controls (§7.7).

Recovery (decision 5), also chosen by Khubaib in the spec interview: the operator re-runs the manual `seed` workflow, which re-creates the accounts and resets firm data to the seed. There is no in-app reset button and no nightly reset.

## Consequences

- Migrations add `app_role`, `app_permission`, `profiles`, `role_permissions` and `has_permission()` (STABLE, SECURITY DEFINER, `search_path` locked), called in policies as `(select has_permission('…'))` (§6).
- `signIn` is a Server Action that validates with `SignInSchema`, calls `signInWithPassword`, and returns `ok`, `invalid_credentials`, `rate_limited` or `server`. Sign-up, password reset and magic links are not supported (§7.1).
- `getViewer()` reads the verified user from `getClaims()` and adds the profile and permissions, wrapped in `cache()`. The root layout passes the permissions to a `PermissionsProvider`, so there is no `/me` request (§7.7).
- The UI shows the role badge, keeps write actions visible but disabled with a reason, hides entry points that lead only to the forbidden page, and renders a forbidden page on the server (§8.10).
- `SEED_ADMIN_PASSWORD` and `SEED_VIEWER_PASSWORD` exist only in the seed script and in GitHub encrypted secrets (§5, §10). Khubaib disables sign-ups in Supabase (§12).
- Tests required by §9: unit tests for `SignInSchema` and the permission-to-UI mapping; integration tests for the RBAC policies (a Viewer cannot insert, update, soft-delete or add notes, even through the API directly; an Admin can), `has_permission` matching the seeded matrix, the seed being idempotent, and `signIn` results; e2e for login and for the Viewer's disabled controls, replaced composer and forbidden edit page.
- README: the demo accounts and what each can do; "Shared firm data and no in-app reset", "Two roles only" and "The role read from `profiles` rather than a JWT claim" under trade-offs; more roles and the JWT role claim at scale under "With more time"; and the operator note on re-running the `seed` workflow (§13).

## Rejected and why

- **Rejected: email-only login with a server-derived password and a private workspace per email.** Every user would own their own workspace, so there would be no meaningful roles to demonstrate. Because typing any new email would create a seeded workspace, it would also need abuse controls for self-creation: a firewall rate-limit rule, a cap on the number of workspaces and a cleanup job.
- **Rejected: anonymous sign-in.** Each new browser would get a new anonymous user with its own data, so a reviewer on a second device would not see their earlier work, and there would be no stable identity to give a role to.
- **Rejected: a role claim in the JWT through Supabase's custom access token hook.** It saves a database lookup per request, but the claim only changes when the token refreshes, so a role change could be ignored for up to an hour, and the hook has to be enabled in the dashboard. It is listed as a scaling option.

## Sources

- Supabase, Password-based Auth — https://supabase.com/docs/guides/auth/passwords — read 2026-11-16
- Supabase, Custom Claims & Role-based Access Control (RBAC) — https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac — read 2026-11-16
- Supabase, Custom Access Token Hook — https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook — read 2026-11-16
- Supabase, Anonymous Sign-Ins — https://supabase.com/docs/guides/auth/auth-anonymous — read 2026-11-16
- Next.js, How to implement authentication in Next.js (Proxy "should not be your only line of defense") — https://nextjs.org/docs/app/guides/authentication — read 2026-11-16
- Next.js security advisory, CVE-2025-29927: Authorization Bypass in Next.js Middleware — https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw — read 2026-11-16
