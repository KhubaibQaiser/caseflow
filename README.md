# Caseflow

Caseflow is a legal-intake mini CRM. It tracks every prospective client, a contact, from first enquiry to retained or closed, so no follow-up is missed. Contacts carry a matter, a referral source and a next follow-up date, and move through Lead, Active and Closed on a pipeline board. The list is a power tool: fast search, filters and sorting by urgency, with overdue follow-ups first.

## Status

- M0 is done: scaffold, contracts, date helpers, design tokens and a fake data layer.
- Next: the BE (Supabase), FE (screens) and OPS (CI and deploy) tracks.
- Live URL: not deployed yet.

## Stack

Next.js 16 (App Router, Server Components and Server Actions), React 19, TypeScript, Tailwind CSS 4, Radix primitives, TanStack Table and Virtual, React Hook Form, Zod 4, nuqs, date-fns, Supabase (Postgres, Auth, RLS), Vitest, Playwright.

## Prerequisites

- Node 24 (`.nvmrc`)
- pnpm 10 via `corepack enable`
- Supabase CLI 3.2 or later
- Docker, for the local Supabase stack

## Getting started

```sh
pnpm install
cp .env.example .env.local   # fill in the values printed by `supabase start`
supabase start
pnpm dev
```

M0 runs on the fake data layer, so `pnpm dev` works without `supabase start` or the local env file.

## Scripts

- `pnpm dev`, `pnpm build`, `pnpm start`: run Next.js
- `pnpm typecheck`: generate route types, then `tsc --noEmit`
- `pnpm lint`: ESLint plus the colour-literal check
- `pnpm test`: unit tests
- `pnpm test:integration`: integration tests
- `pnpm e2e`: Playwright end-to-end tests
- `pnpm format`, `pnpm format:check`: Prettier
- `pnpm seed`: seed the local database (available once the BE track lands)
- `pnpm db:types`: regenerate Supabase types from the local stack (available once the BE track lands)

## Project structure

Layering is `app -> features -> components -> lib -> utils`. Nothing imports upward.

- `lib/contracts`: Zod schemas and types shared by browser and server (contact, filters, list query, facets, permissions, results)
- `lib/dates`: date-only helpers; dates cross the wire as `'YYYY-MM-DD'` strings
- `lib/data`: the server-only data layer; a fake in-memory implementation for now, swapped for Supabase later
- `supabase/`: local stack config; migrations arrive with the BE track
- `tests/`: integration and e2e suites land with the BE and FE tracks (e2e goes in `tests/e2e/`)

## CI

`.github/workflows/ci.yml` runs on every pull request and push to `main`:

- `checks`: format check, typecheck, lint (including the colour-literal check), unit tests, build.
- `integration-e2e`: local Supabase (CLI 3.2), `db reset`, seed when `scripts/seed.ts` exists, integration tests, and e2e when `tests/e2e` exists.
- `gitleaks`: secret scan of each PR's or push's commits.

Actions are pinned by commit SHA. Dependabot opens weekly grouped minor and patch updates for npm and GitHub Actions. PRs use `.github/pull_request_template.md`; `.github/CODEOWNERS` assigns review.

## Deploy

Deploys and the keep-alive are off until the `DEPLOY_ENABLED` repository variable is set to `true` (T23).

`.github/workflows/deploy.yml` runs only after CI passes on a push to `main`:

- A stale-run guard skips any run whose commit is no longer the tip of `main`.
- `supabase db push` applies migrations to the production project.
- The Vercel production env is synced from GitHub secrets; the secret key is stored as sensitive.
- A prebuilt production deploy follows (`vercel build --prod`, then `vercel deploy --prebuilt --prod`). Vercel's Git auto-deploy is off.
- The smoke test (`tests/e2e/smoke.spec.ts`) runs against the deployed URL once that file exists.

`seed.yml` is a manual workflow (`workflow_dispatch`) that only runs on `main`; it restores the demo accounts and data. `keep-alive.yml` pings Supabase daily so the project does not pause. There are no PR previews.

## Docs

- `docs/SPEC.md`: the binding spec
- `docs/PLAN.md`: the implementation plan
- `docs/DECISIONS.md` and `docs/adr/`: decisions and ADRs
- `DESIGN.md`: design system
- `AGENTS.md`: rules for agents and contributors

## Decisions that differ from the spec

- Filters use a flat follow-up range (`followUpFrom`/`followUpTo`) instead of the nested form in section 7.4.
- Soft-deleted contacts are readable through the raw API and the app's queries filter them out; the spec (section 6) wants RLS to hide them.
- The focus style adds a 2px accent outline to the spec ring for 3:1 contrast.
- Control borders are darker than the mockups for 3:1 contrast.
- Closed contacts with a follow-up date sort after open dated contacts.
