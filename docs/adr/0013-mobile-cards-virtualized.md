# ADR-0013 — Virtualize the phone contact cards, with the window as the scroll element

## Title

Virtualize the contact card list below 768px, as the desktop table is, with the window as the scroll element and cards measured after they render

## Status

`accepted` (Khubaib, 2026-11-27), with the decisions in §3 of the spec as recommended.

## Date

2026-11-27

## Context

ADR-0006 virtualizes the desktop table with TanStack Virtual, so only the rows near the viewport are in the page. Below 768px the same data is shown as cards, and those are not virtualized: the cards use the browser's `content-visibility` setting instead, which skips layout and paint for off-screen cards but keeps every card in the page.

Phones have the least memory and processing power, so a long list costs the most there. The repo has no measurement showing that the current approach is smooth at 500 cards on a mid-range phone. The two screens also behave differently for the same data, and that is hard to defend.

Two constraints shape the choice:

- The header hides on scroll by reading the window's scroll position (`components/shell/use-headroom.ts`), and the footer pager sits below the list. Both depend on the page scrolling, not a box inside it.
- Card heights vary. A card with a long name or matter wraps, so a fixed height would be wrong.

The spec is `docs/specs/mobile-virtualized-cards.md`.

## Options considered

### Option 1 — Window virtualizer, cards measured after render (recommended)

- **Pros:** The page keeps scrolling as it does today, so the header and the footer keep working. Only the cards near the viewport are in the page on every screen. The same library is already installed, and the desktop table already uses it. Screen readers get the true count and position from `aria-setsize` and `aria-posinset`.
- **Cons:** Needs the list's position in the document, re-read after each render and on resize. Cards are absolutely placed and measured, which is more code than the table's fixed rows. Off-screen cards are not in the page. This is the trade-off ADR-0006 records for the table.

### Option 2 — Scroll-box virtualizer, the same as the desktop table

- **Pros:** Identical code path to the desktop table, so one pattern to maintain. Simpler positioning, since the box is a fixed height.
- **Cons:** The page no longer scrolls, so the header's hide-on-scroll stops reacting, and the footer pager's place in the layout changes. Scrolling inside a box is less native on phones. Both behaviours would need rework and new tests.

### Option 3 — Keep `content-visibility` and measure first (status quo)

- **Pros:** No JavaScript for the list, no code change, and every card stays in the page, which some users may expect.
- **Cons:** Every loaded card stays in the page on the lowest-spec devices, so memory and layout grow with the page size. There is no measurement in the repo. The two screens keep behaving differently.

## Decision

Option 1, accepted. The decisions and their recommendations are in §3 of the spec. The reload gap (D6) is measured on a mid-range Android before release.

## Consequences

- **Positive:** Phones draw the same small window as desktop. The page scroll, the header and the footer keep their behaviour. No new library.
- **Negative:** The server HTML holds only the first window. On a reload or Back at a deep scroll, the list can look empty until the page hydrates. This is decision D6 in the spec, to be measured on a phone. More positioning code than the table. Off-screen cards are not in the page, the trade-off ADR-0006 records for the table. Search and filters already cover finding contacts.
- **Follow-up:** the spec's manual checks (screen reader on a phone, rotation, long names) must pass before merge.

## Rejected and why

- **Option 2:** it changes how the header and the footer behave, which the phone layout depends on, for the sake of one code path.
- **Option 3:** it keeps the lowest-spec devices drawing every card, and the repo offers no evidence that this is acceptable.

## Sources

- `docs/adr/0006-list-pagination-virtualization.md`
- `docs/specs/mobile-virtualized-cards.md`
- `components/shell/use-headroom.ts` and `components/shell/headroom.tsx`
- `features/contacts/list/contact-cards.tsx` and `features/contacts/list/contacts-table.tsx`
- TanStack Virtual, `useWindowVirtualizer` (`@tanstack/react-virtual` 3.14.26, `@tanstack/virtual-core` 3.19.11)
