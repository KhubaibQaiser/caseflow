# Caseflow agent guide

Caseflow is a legal-intake mini CRM (Next.js 16 + Supabase).

## Roles

Khubaib decides. The agent proposes. Only Khubaib flips an ADR from `proposed` to `accepted`.

## Before each task

Read `docs/SPEC.md`, `docs/PLAN.md` and `docs/adr/README.md`. Before writing route, proxy, caching, `forbidden` or error-boundary code, read `node_modules/next/dist/docs/` (Next 16 renamed `middleware` to `proxy`).

## Global constraints

- No `any`, no `@ts-ignore`. Validate with Zod at every trust boundary (form, Server Action, RPC response).
- No colour literals outside `app/globals.css`. Design tokens only; light and dark via tokens, System default.
- Layering is `app -> features -> components -> lib -> utils`; nothing imports upward. `lib/data`, `lib/supabase` and `lib/auth/viewer.ts` start with `import 'server-only'`.
- Front-end structure. One React component per file, named after the component. A component file holds UI only. Business logic and effects go in a `use-*.ts` hook beside the feature (or in `components/` when shared). A component file may keep plain state (`useState`, `useId`, `useContext`, `useRef`) and may call hooks imported from a `use-*` module. A very small component, 40 non-blank lines or fewer, may call up to two other hooks itself, effects included. `pnpm lint` enforces this with `scripts/check-frontend-structure.mjs`.
- Tailwind: native classes and the theme's scale and tokens only. No arbitrary values or properties (`text-[11px]`, `[content-visibility:auto]`). Add a token or use a scale step instead. Arbitrary variants are fine (`data-[state=open]:`, `aria-[current=page]:`), but the utility after them follows the rule. The same guard enforces this.
- The guard records existing violations in `scripts/frontend-structure-baseline.json`. A file may not exceed its recorded count, and a new file with a violation fails. When you fix one, run `node scripts/check-frontend-structure.mjs --write-baseline` to lower the count.
- Terminology: "contact", "matter", "follow-up", "Lead / Active / Closed". Never "deal" or "customer". Voice is crisp power-tool (PRODUCT.md).
- Dates cross browser/server only as `'YYYY-MM-DD'` strings. Never `toISOString()` for date-only values.
- Page sizes `[25, 50, 100, 250, 500]`, default `250`. Pipeline columns load `50` per request.
- Urgency order: overdue, due today, soonest follow-up, no follow-up; ties by `updated_at desc`. Closed dated rows sort after open dated rows. Only Lead and Active can be overdue or due today.
- Accessibility: WCAG 2.2 AA (contrast 4.5:1, targets 24px, visible focus, no colour-only meaning, menu alternative to dragging).
- Performance: Lighthouse Performance >= 90 and Accessibility >= 95 on `/contacts` (mobile). CLS < 0.05. `/contacts` JS < 220kB gzipped. Import icons one at a time.
- Commits are small and imperative, failing test first. PRs merge with merge commits. End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Secrets never appear in code, logs, chat or commits.
- Secrets go in with `gh secret set` / `vercel env add` from piped values only.

## Commands

Use Node 24 and pnpm 10.

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm typecheck`, `pnpm lint` (eslint + colour-literal check)
- `pnpm test` (unit), `pnpm test:integration`, `pnpm e2e`
- `pnpm format`, `pnpm format:check`
- `pnpm seed`, `pnpm db:types`

## This is NOT the Next.js you know

This version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
