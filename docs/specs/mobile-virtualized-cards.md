# Spec: virtualize the phone contact cards

- **Status:** proposed. Khubaib confirms the decisions in §3 and accepts [ADR-0013](../adr/0013-mobile-cards-virtualized.md).
- **Date:** 2026-11-27
- **Scope:** the contact card list below 768px on `/contacts`.
- **Out of scope:** the desktop table (already virtualized), pagination, sort, search, filters, the pipeline.

## 1. Problem

Below 768px the contacts list draws every card on the page, up to 500 with the page size set to 500. Phones have the least memory and processing power, so long lists cost the most there. The desktop table already draws only the rows near the viewport. The phone list does not, so the two screens behave differently for the same data.

The current phone list relies on the browser's `content-visibility` setting to skip work for cards off screen. The repo has no measurement showing that is smooth on a mid-range phone at 500 cards.

## 2. Goal

The phone card list behaves like the desktop table:

- only the cards near the viewport, plus a small margin, are in the page;
- the list is as tall as its cards, so the page scrolls to the true end;
- every card keeps its place in the whole set for screen readers (`aria-posinset`, `aria-setsize`);
- server paging, sort, search and the filter panel are unchanged;
- the header hides on scroll and the footer pager stays, as today.

## 3. Decisions

Each has a recommendation. Khubaib picks.

| # | Decision | Recommended | Alternatives and why not |
|---|---|---|---|
| D1 | What scrolls | **The window.** The header and footer already read window scroll (`components/shell/use-headroom.ts`). | A scroll box, as the desktop table does. It would stop the header reacting to the page scroll and change how the footer pager sits. |
| D2 | Card height | **Measured after each card renders.** The estimate is 72px, the card's content box. | A fixed 72px. Cards wrap when a name or matter is long, so a fixed height would clip them or leave gaps. |
| D3 | Overscan | **8 cards** (about 576px at 72px each). | 12, as the table uses. Phone cards are twice as tall, so 8 covers the same ground. |
| D4 | Hidden instance on desktop | **Keep the list mounted and hidden** (`md:hidden`), as today. A hidden card measures 0, so the list falls back to the estimate and still draws only a window. | Unmount on desktop with a media query. It adds server-rendering complexity for no gain. |
| D5 | Dependency | **Use `@tanstack/react-virtual`, already installed.** | A new library. The dependency guard and the bundle budget both count against it. |

## 4. Behaviour

- Below 768px the list is one `ul` labelled "Contacts". Each card is placed absolutely at its offset.
- The list's height equals the total height of its cards, so the page scrolls to the true end and the footer pager sits where it did.
- Each card is still a link to `/contacts/{id}`. The phone number is still a `tel:` link.
- Keyboard: Tab moves card to card. Cards beyond the viewport are in the page, so focus always has a next card. The browser scrolls the focused card into view.
- Changing page scrolls the window to the top, as today.
- Resizing across 768px re-reads the list's position, so the window stays correct.
- The server draws a first phone-sized screen (390 × 844), so the first cards paint before the page hydrates.

## 5. Trade-offs

- Off-screen cards are not in the page. This is the trade-off ADR-0006 already records for the desktop table.
- Every card's height is measured once it renders, so a card that changes height (for example when a name wraps after an edit) moves the cards below it. The list corrects on the next scroll.

## 6. What could break, and how each risk is checked

| Area | Risk | Handling | Checked by |
|---|---|---|---|
| Header hide on scroll | Window scroll no longer drives it | Window scroll is kept (D1) | `tests/e2e/mobile-scroll.spec.ts`, header test |
| Footer pager | Page change scrolls wrongly, or the footer moves | Pager and window scroll unchanged | `tests/e2e/mobile-scroll.spec.ts`, pager test |
| Page length | Scrollbar too short or too long | Height set to the card total | RTL "gives the list the full height" |
| First paint and hydration | Server and client draw different cards | `initialRect` set to a phone screen | Browser console has no hydration warning |
| Card height | Wrapped names overlap or leave gaps | Cards measured after render | RTL window tests; browser check with long names |
| Keyboard | Focus has nowhere to go past the window | Eight cards beyond the viewport | RTL "keeps cards past the visible window"; browser Tab check |
| Screen readers | Wrong count or position | `aria-posinset` and `aria-setsize` use the whole set | RTL "gives each card its place in the whole set"; **manual VoiceOver check on a phone, not run here** |
| Layout shift | Cards jump on load | Absolute placement with measured heights | Existing CLS test at 320px |
| Accessibility | New markup fails axe | Same roles and labels as before | Existing axe test at 320px |
| Desktop | The hidden list does work for nothing | Hidden list draws only a window (D4) | Desktop run in the browser check |
| Resize | Position stale after rotating or resizing | Re-read on resize | Browser check: rotate and resize across 768px |
| Filter or sort while scrolled | The window stays where it was | Unchanged from today | Noted, not changed |
| Bundle size | `/contacts` over 220 kB gzipped | No new library | `pnpm size` (not run here, needs a build) |
| Page scroll and sticky elements | The toolbar and sheet overlap cards | Unchanged positioning | Existing tests and the browser check |

## 7. Tests

**Integration (React Testing Library)**, `features/contacts/list/contact-cards.test.tsx`:

1. renders a window of cards, not every card on the page;
2. gives each card its place in the whole set;
3. gives the list the full height of its cards;
4. brings later cards in and takes earlier ones out as the window scrolls;
5. keeps cards past the visible window, so keyboard focus can move on;
6. links each card to its contact and keeps the phone as a call link;
7. renders an empty list for an empty page.

The jsdom environment has no layout or page height. The tests give the list a position at the top of the page and a page height of 20,000px, so scroll offsets behave as they would in a browser.

**Browser (existing end-to-end suite, run in a real browser):** the header, pager and axe tests in `tests/e2e/mobile-scroll.spec.ts` and `tests/e2e/a11y.spec.ts`, plus a manual check of Tab, rotation and long names.

## 8. Rollout and revert

- No feature flag. The change is confined to one component and its tests.
- To revert, revert the implementation commit. The tests and docs stay correct against the old behaviour once the commit is reverted, so revert the docs with it.

## 9. Documents that change with this

- `docs/adr/0013-mobile-cards-virtualized.md` (new, proposed), and its row in `docs/adr/README.md`
- `docs/adr/0006-list-pagination-virtualization.md` gains a pointer to ADR-0013
- `docs/DECISIONS.md` gains row 35
- `docs/SPEC.md` (narrow viewports) describes the virtualized card list
- `docs/PLAN.md` (`ContactCards`) describes the virtualized card list
- `docs/RUNBOOK.md` (cards) describes the virtualized card list
- `docs/REVIEWER-GUIDE.md` (pagination row) covers the phone list too
