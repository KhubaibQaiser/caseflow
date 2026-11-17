# ADR-0006 — Paginate on the server and virtualize the rows

## Title

Use server offset pagination with an exact count, plus TanStack Virtual, with a default page size of 250

## Status

`accepted` (Khubaib, 2026-11-17)

## Date

2026-11-16

## Context

Spec decision 8. The list needs search, a status filter and sorting (G1) over about 2,500 seeded contacts in the firm workspace, with server-side pagination, page sizes of 25/50/100/250/500, a default of 250, and virtualized rows (G8). All filter, sort and paging state lives in the URL, so a view can be shared and survives the back button and a refresh (spec §8.3). The header shows "1,284 of 2,437", so an exact count is needed. Performance targets: 500 rows scroll at 60fps and CLS stays below 0.05 (§8.9, §8.12). Virtualized rows are not all in the DOM, so the browser's find (Ctrl+F) only finds rendered rows.

## Options considered

### Option 1 — Server offset pagination with an exact count, plus TanStack Virtual (chosen)

- **Pros:** Pages are addressable in the URL (`?page=`, `?pageSize=`). The exact count drives "N of M", `aria-rowcount` and the pager with first and last pages. Virtualization keeps 250 or 500 rows smooth. TanStack Table runs in manual mode, so sorting and paging stay on the server.
- **Cons:** Ctrl+F only finds rendered rows. Virtualized rows need `aria-rowcount` and `aria-rowindex` to keep table semantics. Offset paging slows down at much larger volumes than 2,500.

### Option 2 — Pagination only, at 50 rows

- **Pros:** No virtualization needed, so every row on the page is in the DOM and Ctrl+F works.
- **Cons:** Conflicts with the agreed default of 250 rows and options up to 500 (G8).

### Option 3 — Infinite scroll

- **Pros:** No pager, and scanning down a list is continuous.
- **Cons:** The scroll position is not a URL parameter, so a refresh, the back button or a shared link loses the user's place. Reaching the last rows means loading everything before them.

## Decision

Option 1. Chosen by Khubaib in the spec interview. Server pagination with an exact count keeps every page addressable and the counts honest, and virtualization keeps the agreed default of 250 rows fast, with the Ctrl+F cost stated in the README and mitigated by the advanced filters.

## Consequences

- `search_contacts` returns `rows`, `total` and `matching` for a page. A stale or invalid URL (`?page=999`) clamps to the last page (§8.9).
- Changing the page scrolls to the top and focuses the table caption. Fonts cause no layout shift because `next/font` supplies a size-adjusted fallback, so rows are not held back waiting for fonts (§8.3, §8.9).
- Below 768px the table becomes a card list with a Sort menu (§8.3).
- Tests required by §9: e2e for list search, filters, sort and pagination, then a reload that keeps the state; unit tests for `FiltersSchema` and the URL parsers; axe on every route. The 500-row 60fps scroll is a manual check during the audit (§8.9).
- README: "Virtualization versus Ctrl+F" under trade-offs, and keyset pagination at scale under "With more time" (§13).

## Rejected and why

- **Rejected: plain pagination at 50 rows per page.** It needs no virtualization and keeps browser find working, but the page sizes agreed for the product go up to 500 rows with a default of 250, and at those sizes rows need virtualization to keep scrolling smooth.
- **Rejected: infinite scroll.** The user's position would not be in the URL, so refreshing, going back or sharing a link would lose their place, and jumping to the end of the list would mean loading every row before it.

## Sources

- TanStack Virtual, Introduction — https://tanstack.com/virtual/latest/docs/introduction — read 2026-11-16
