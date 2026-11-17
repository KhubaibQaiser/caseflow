# ADR-0004 — Limit sign-in abuse with Supabase's per-IP limits

## Title

Use Supabase's per-IP sign-in limits, with the client IP forwarded through `Sb-Forwarded-For`, as the only abuse limit

## Status

`accepted` (Khubaib, 2026-11-17)

## Date

2026-11-16

## Context

Spec decision 4. Sign-ups are disabled and the two accounts are pre-seeded (G10), so nothing a visitor does creates users or data, and the only public surface is sign-in. Sign-in runs on the server in the `signIn` Server Action (§7.1), so without forwarding, Supabase sees Vercel's IP rather than the user's, and its per-IP limits would group every reviewer together. The login screen must show a clear "Too many attempts" message when the limit is hit (§8.8). Whether the default sign-in limit suits several reviewers signing in from one office network is unknown.

## Options considered

### Option 1 — Supabase sign-in limits with the client IP forwarded (chosen)

- **Pros:** Supabase already limits sign-ins per IP address. The server sends `Sb-Forwarded-For: <client ip>` with the secret key, so each reviewer is limited individually rather than the Vercel server as a whole. No new code beyond the header, no new tables and no new vendor.
- **Cons:** IP forwarding has to be enabled in the Supabase dashboard, outside the repo. People behind one shared office IP share one limit.

### Option 2 — A Vercel WAF rate-limit rule

- **Pros:** Blocks traffic at the edge before it reaches the app.
- **Cons:** With no sign-up there is no creation endpoint left to protect, and sign-in is already limited by Supabase. The rule lives in the Vercel dashboard, not in the repo.

### Option 3 — A Postgres rate-limit table

- **Pros:** Everything stays in the database and the repo.
- **Cons:** More code: a table, the counting and expiry logic, and tests for all of it, for a limit Supabase already applies.

## Decision

Option 1. Chosen by Khubaib in the spec interview. With sign-ups disabled the only public surface is sign-in, and Supabase's own per-IP sign-in limits cover it once the client IP is forwarded, with no extra rule or code to own.

## Consequences

- `signIn` calls `signInWithPassword` through a secret-key client that sends `Sb-Forwarded-For` with the client IP (§7.1).
- A Supabase 429 maps to `rate_limited`, with `retryAfter` when available. The login screen shows "Too many attempts. Try again in N minutes." through `aria-live` (§8.8).
- Khubaib disables sign-ups and enables IP forwarding for auth rate limits in Supabase (§12).
- Tests required by §9: an integration test that a mocked Supabase 429 maps to `rate_limited`.
- README: §13 lists no trade-off for this decision.

## Rejected and why

- **Rejected: a Vercel firewall rate-limit rule.** With sign-ups disabled there is no endpoint that creates users or data, so there is nothing left for it to protect that Supabase does not already limit. The rule would also live in the Vercel dashboard rather than in the repo, so it could not be reviewed or reproduced from the code.
- **Rejected: a rate-limit table in Postgres.** It would keep everything in the repo, but the table, the counting and expiry logic, and their tests are all extra code, while Supabase already limits sign-ins per IP.

## Sources

- Supabase, Rate limits (including forwarding the client IP with `Sb-Forwarded-For`) — https://supabase.com/docs/guides/auth/rate-limits — read 2026-11-16
- Vercel, WAF Rate Limiting — https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting — read 2026-11-16
