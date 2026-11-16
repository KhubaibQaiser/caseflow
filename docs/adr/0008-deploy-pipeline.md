# ADR-0008 — Deploy from GitHub Actions in a fixed order

## Title

Use GitHub Actions to run checks, then `supabase db push`, then `vercel deploy --prebuilt --prod`, then a read-only production smoke test, with no PR previews

## Status

`proposed`

## Date

2026-11-16

## Context

Spec decision 12. The deliverable is a live Vercel link and a repo with a meaningful history (G7), with strong CI/CD: checks on every PR, including integration and e2e tests against a local Supabase, and an ordered migrate → deploy → smoke test pipeline on `main` (G11). A deploy must never run against a schema that its migrations have not reached yet. There is one Supabase project, holding the shared firm workspace and the two seeded accounts, so anything deployed runs against production data. A live link that is down when reviewed is an anti-goal. When a staging Supabase project will be added is unknown.

## Options considered

### Option 1 — One GitHub Actions pipeline in order, no PR previews (chosen)

- **Pros:** On `main`: checks, then `supabase db push`, then `vercel deploy --prebuilt --prod`, then a Playwright smoke test that signs in as the Viewer and checks the contacts list renders. The smoke test is read-only, so it never changes production data. Each step only runs if the one before passed. The whole pipeline is visible in the repo. PRs are gated by CI against a local Supabase, so nothing unmerged touches production.
- **Cons:** More workflow code to own. Vercel and Supabase tokens are kept as GitHub secrets. Vercel's automatic Git deploys must not also run, or they would race this pipeline. Reviewers of a PR cannot click through a deployed preview.

### Option 2 — Vercel Git integration plus a separate migration job

- **Pros:** Vercel builds and deploys on push with no workflow to write.
- **Cons:** The deploy and the migration run independently and race, so new code can go live before its migration has run.

### Option 3 — PR preview deploys against the production database

- **Pros:** Each PR gets a live URL to click through.
- **Cons:** With one Supabase project, a preview whose branch adds a migration either breaks against the old schema or, if it migrates, changes production before the PR is reviewed. A preview signed in as the Admin would also write to the shared firm data.

## Decision

Option 1. Chosen by Khubaib in the spec interview. One ordered pipeline guarantees that migrations finish before the deploy and that the smoke test runs against what was deployed, which the Vercel Git integration with a separate migration job cannot, because the two race. PR previews are left out as a known gap until a staging project exists.

## Consequences

- PRs run `checks` (format, lint with `jsx-a11y`, typecheck, unit tests, build), `integration-e2e` (`supabase start`, `supabase db reset` and `pnpm seed`, integration tests, then a production build with Playwright and axe) and `gitleaks`. There are no preview deploys (§10).
- A manual `seed` workflow (`workflow_dispatch`) runs the idempotent account and data seed against production. It is how the operator restores the demo accounts or the firm data (§10, §13).
- A scheduled daily keep-alive query prevents the Supabase pause (§10).
- GitHub secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and for the `seed` workflow `SEED_ADMIN_PASSWORD`, `SEED_VIEWER_PASSWORD`, the Supabase URL and secret key. Branch protection is switched on when the repo is made public at submission, and PRs merge with merge commits so the TDD history survives (§10).
- Tests: §9 lists no test for this decision itself. The pipeline runs the §9 suites as gates and adds the read-only production smoke test (§10).
- README: "No PR previews (no staging project)" under trade-offs, and a staging project with PR previews under "With more time" (§13).

## Rejected and why

- **Rejected: Vercel's Git integration with a separate migration job.** Vercel would deploy on every push while a separate job ran the migrations, and nothing would make the deploy wait for the migration, so new code could go live against an old schema.
- **Rejected: preview deploys for each pull request against the production database.** There is only one Supabase project, so a preview for a branch with a new migration would either break against the current schema or change production before the change was reviewed, and anyone using the preview as the Admin would edit the shared demo data. Pull requests are checked against a local Supabase instead, and a staging project for previews is future work.

## Sources

- Supabase CLI reference, `supabase db push` — https://supabase.com/docs/reference/cli/supabase-db-push — read 2026-11-16
- Vercel, `vercel deploy` (including `--prebuilt`) — https://vercel.com/docs/cli/deploy — read 2026-11-16
