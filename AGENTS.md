# Caseflow agent guide

Caseflow is a legal-intake mini CRM (Next.js 16 + Supabase).

## Roles

Khubaib decides. The agent proposes. Only Khubaib flips an ADR from `proposed` to `accepted`.

## Before each task

Read `docs/SPEC.md`, `docs/PLAN.md` and `docs/adr/README.md`. Before writing route, proxy, caching, `forbidden` or error-boundary code, read `node_modules/next/dist/docs/` (Next 16 renamed `middleware` to `proxy`).

## Global constraints

- No `any`, no `@ts-ignore`. Validate with Zod at every trust boundary (form, Server Action, RPC response).
- No colour literals outside `app/globals.css`. Design tokens only; v1 is light mode only.
- Layering is `app -> features -> components -> lib -> utils`; nothing imports upward. `lib/data`, `lib/supabase` and `lib/auth/viewer.ts` start with `import 'server-only'`.
- Terminology: "contact", "matter", "follow-up", "Lead / Active / Closed". Never "deal" or "customer". Voice is crisp power-tool (PRODUCT.md).
- Dates cross browser/server only as `'YYYY-MM-DD'` strings. Never `toISOString()` for date-only values.
- Page sizes `[25, 50, 100, 250, 500]`, default `250`. Pipeline columns load `50` per request.
- Urgency order: overdue, due today, soonest follow-up, no follow-up; ties by `updated_at desc`. Only Lead and Active can be overdue or due today.
- Accessibility: WCAG 2.2 AA (contrast 4.5:1, targets 24px, visible focus, no colour-only meaning, menu alternative to dragging).
- Performance: Lighthouse Performance >= 90 and Accessibility >= 95 on `/contacts` (mobile). CLS < 0.05. `/contacts` JS < 180kB gzipped. Import icons one at a time.
- Commits are small and imperative, failing test first. PRs merge with merge commits. End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Secrets never appear in code, logs, chat or commits.

## Commands

Use Node 24 and pnpm 10.

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm typecheck`, `pnpm lint` (eslint + colour-literal check)
- `pnpm test` (unit), `pnpm test:integration`, `pnpm e2e`
- `pnpm format`, `pnpm format:check`
- `pnpm seed`, `pnpm db:types`

## This is NOT the Next.js you know

This version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
