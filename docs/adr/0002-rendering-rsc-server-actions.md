# ADR-0002 — Read with Server Components, write with Server Actions

## Title

Use the Next.js App Router: RSC for reads, Server Actions for writes, `useOptimistic` for moves, sessions in httpOnly cookies

## Status

`proposed`

## Date

2026-11-16

## Context

Spec decision 2. Every screen needs honest loading, empty and error states (G5), data must persist (G6), and the app is deployed to Vercel (G7). The pipeline needs moves that feel instant and roll back on failure (G4). Sign-in uses the Supabase secret key to forward the client IP, so it must run on the server (spec §5, §7.1), and every page and write must check permissions on the server before touching data (§7.7). The Supabase session must not be readable by page scripts. Which Next.js 16.x minor version `create-next-app` will pin at scaffold time is unknown until then (§5).

## Options considered

### Option 1 — Next.js App Router with RSC reads and Server Actions (chosen)

- **Pros:** Reads run on the server with the user's JWT, so RLS applies and no token reaches browser JavaScript. Sessions live in httpOnly cookies. `loading.tsx`, `error.tsx` and Suspense give each route its loading and error states. Server Actions call `requirePermission` and re-validate with the same Zod schema as the form. `useOptimistic` covers pipeline moves.
- **Cons:** Next 16 changes conventions (`middleware` is now `proxy`), so the bundled docs must be read before writing route, proxy or caching code. Server Actions must handle an expired session themselves and return `unauthorized`.

### Option 2 — TanStack Query against Supabase from the browser

- **Pros:** A mature client cache with retries and background refetching.
- **Cons:** The browser holds the Supabase session token in localStorage, where any injected script can read it.

### Option 3 — Vite single-page app

- **Pros:** A simple client-only build.
- **Cons:** No server of its own. Sign-in with the secret key and the server permission checks would need a separate backend, and data calls would go from the browser with the same token exposure as Option 2. Next.js was the stated preference.

## Decision

Option 1. Chosen by Khubaib in the spec interview. Server Components read and Server Actions write with the session in httpOnly cookies, which keeps the token out of browser JavaScript, where TanStack Query against Supabase would leave it in localStorage open to XSS.

## Consequences

- Data access lives in server-only `lib/data`. Writes go through Server Actions that return `Result<T>` and call `revalidatePath` (§7.5).
- Every route has `loading.tsx` and `error.tsx`, with Suspense around the data regions (§8.8, §8.12).
- `proxy.ts` refreshes the session and redirects to `/login?next=…`, adding `reason=expired` when a session has died (§8.1). It only checks that a session exists; pages and actions authorize with `requirePermission` (§7.7).
- Tests required by §9: integration test for edit conflict detection in `updateContact`; e2e for create with validation errors then success then edit, a note appearing in the timeline, and pipeline move and reload (`useOptimistic` with rollback).
- README: "Component structure and state management" explains RSC reads, Server Action writes and `useOptimistic` (§13).

## Rejected and why

- **Rejected: TanStack Query talking to Supabase from the browser.** The browser would keep the Supabase session token in localStorage, where any injected script can read it. Reading on the server and keeping the session in an httpOnly cookie removes that exposure.
- **Rejected: a Vite single-page app.** It has no server, but sign-in needs one to call Supabase with a secret key that must never reach the browser, and permissions must be checked on a server the user cannot modify. A separate backend would be needed for that, and data calls from the browser would bring back the token exposure above. Next.js was also the stated preference.

## Sources

- Next.js, Server and Client Components — https://nextjs.org/docs/app/getting-started/server-and-client-components — read 2026-11-16
- Next.js, Mutating Data — https://nextjs.org/docs/app/getting-started/mutating-data — read 2026-11-16
- React, `useOptimistic` — https://react.dev/reference/react/useOptimistic — read 2026-11-16
