# ADR-0007 — Query contacts through two RPCs that share one predicate

## Title

Use two Postgres RPCs, `search_contacts` and `contact_facets`, sharing one SQL predicate, with partial-match search through pg_trgm

## Status

`proposed`

## Date

2026-11-16

## Context

Spec decisions 9 and 10. The list needs search, filters and sorting (G1). The filters panel shows facet counts and quick views with counts (G9). An anti-goal is counts that contradict the filters. The volume is about 2,500 contacts in the firm workspace (G8), and the RPCs must return in under 50ms (§8.12). RLS must still apply to every query, so a user only sees what their role's permissions allow. Coordinators search by part of a name or phone number while on a call, so "5550148" must match "(512) 555-0148" (§8.9).

## Options considered

### Option 1 — Two RPCs sharing one SQL predicate, SECURITY INVOKER (chosen)

- **Pros:** The list and the counts use the same predicate, so they cannot disagree. `contact_facets` counts every facet in one pass with `count(*) filter (where …)`, each group applying every filter except its own. SECURITY INVOKER keeps RLS in force. Both RPCs take the user's time zone, so "overdue" means the same thing everywhere.
- **Cons:** Filter logic lives in SQL, so the filter shape has to match `FiltersSchema` on both sides. Changing an RPC needs a migration.

### Option 2 — PostgREST query builder plus separate count queries

- **Pros:** No custom SQL functions; queries are built in TypeScript.
- **Cons:** The filter logic is duplicated across the list query and each count query, so the two can drift apart.

### Option 3 — Filtering in the browser

- **Pros:** Instant filtering with no round trip once data is loaded.
- **Cons:** Does not work at volume: every contact would have to be sent to the browser first.

## Decision

Option 1. Chosen by Khubaib in the spec interview. Two RPCs sharing one SQL predicate mean the list and the counts cannot disagree, and SECURITY INVOKER keeps RLS in force.

Search (decision 10), also chosen by Khubaib in the spec interview: partial match with pg_trgm across name, email, phone digits and matter summary, because coordinators type part of a word or number.

## Consequences

- A generated `phone_digits` column. No trigram indexes at this volume, because `ilike '%q%'` takes about 1ms at 2,500 rows; the README's scale path adds `pg_trgm` GIN indexes past about 50,000 rows (§6).
- Allowed sorts are fixed: `follow_up`, `name`, `waiting`, `updated`, `status` (§7.2).
- Facet counts reflect applied filters only, not the draft in the open panel.
- Tests required by §9: integration tests that **facets match `search_contacts` totals** for a set of filter combinations, the RBAC policies, and time-zone "today" differing between two zones. The phone-digits search is in the edge-case catalogue (§8.9).
- README: "Facet counts based on applied filters only" under trade-offs, and live draft counts under "With more time" (§13).

## Rejected and why

- **Rejected: the PostgREST query builder with separate count queries.** The same filter logic would be written once for the list and again for every count, and any difference between them would show counts that contradict the rows on screen.
- **Rejected: filtering in the browser.** It would mean sending every contact in the workspace to the browser before showing a page, which does not hold up at thousands of contacts.
- **Rejected: full-text search with `websearch_to_tsquery`.** It matches whole words only, so typing the start of a name or part of a phone number would find nothing.
- **Rejected: a field-scoped search syntax such as `status:lead`.** It was estimated at two extra hours and is left as future work; the filters panel already covers filtering by field.

## Sources

- PostgreSQL documentation, pg_trgm — https://www.postgresql.org/docs/current/pgtrgm.html — read 2026-11-16
- Supabase, Database functions — https://supabase.com/docs/guides/database/functions — read 2026-11-16
