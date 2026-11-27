# Spec: virtualize the phone contact cards

- **Status:** accepted (Khubaib, 2026-11-27). D1 to D6 in §3 are accepted as recommended. See [ADR-0013](../adr/0013-mobile-cards-virtualized.md).
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
| D2 | Card height | **Measured after each card renders.** The estimate is about 72px, padding and divider included. | A fixed 72px. Cards wrap when a name or matter is long, so a fixed height would clip them or leave gaps. |
| D3 | Overscan | **8 cards** (about 576px at 72px each). | 12, as the table uses. Phone cards are twice as tall, so 8 covers the same ground. |
| D4 | Hidden instance on desktop | **Keep the list mounted and hidden** (`md:hidden`), as today. A hidden card measures 0, so the list falls back to the estimate and still draws only a window. It keeps a window of cards mounted and listens for resize and page-height changes, which costs little. | Unmount on desktop with a media query. It adds server-rendering complexity for no gain. |
| D5 | Dependency | **Use `@tanstack/react-virtual`, already installed.** | A new library. The dependency guard and the bundle budget both count against it. |
| D6 | Reload or Back at a deep scroll | **Accept it, and measure it on a phone.** The server draws the first window only, so for the moment before the page hydrates a deep reload can show an empty list. The old list drew every card in the HTML and did not have this gap. | Draw every card in the HTML: this brings back the cost the change removes. Hide the list until the first scroll read: the phone shows a blank panel for the same moment. Khubaib decides; the measurement comes first. |

## 4. Behaviour

- Below 768px the list is one `ul` labelled "Contacts". Each card is placed absolutely at its offset.
- The list's height equals the total height of its cards, so the page scrolls to the true end and the footer pager sits where it did.
- Each card is still a link to `/contacts/{id}`. The phone number is still a `tel:` link.
- Keyboard: Tab moves card to card. Cards beyond the viewport are in the page, so Tab has a next card to move to, and the browser scrolls the focused card into view. A card that is focused and then scrolled well out of the window leaves the page, and focus falls back to the page. That is the known limit of this design.
- Changing page scrolls the window to the top, as today.
- Resizing, and any change in the page's height above the list, re-reads the list's position, so the window stays correct.
- The server draws a first phone-sized screen (390 × 844), so the first cards paint before the page hydrates.

## 5. Trade-offs

- Off-screen cards are not in the page. This is the trade-off ADR-0006 already records for the desktop table.
- Every card's height is measured once it renders, so a card that changes height (for example when a name wraps after an edit) moves the cards below it. The list corrects as soon as the card is measured, so the move is brief.

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
| Desktop | The hidden list keeps a window mounted and listens for resize | Hidden list draws only a window (D4) | Desktop run in the browser check |
| Resize | Position stale after rotating or resizing | Re-read on resize | Browser check: rotate and resize across 768px |
| Filter or sort while scrolled | The window stays where it was | Unchanged from today | Noted, not changed |
| Bundle size | `/contacts` over 220 kB gzipped | No new library | `pnpm size` (not run here, needs a build) |
| Reload or Back at a deep scroll | The server HTML holds only the first window, so the list can look empty until the page hydrates | Decision D6. Measured on a phone before release. | Server HTML test (RTL); browser measurement, not yet run |
| Page scroll and sticky elements | The toolbar and sheet overlap cards | Unchanged positioning | Existing tests and the browser check |

## 7. Tests

**Integration (React Testing Library)**, `features/contacts/list/contact-cards.test.tsx`, covering:

- a window of cards, not every card on the page, and exactly the cards that fit plus eight;
- each card's place in the whole set;
- the list's full height, and the shorter list after a shorter page;
- later cards in and earlier ones out as the window scrolls;
- the list measured where it really is, so a toolbar above it does not shift the window;
- the list measured again on resize;
- cards past the visible window, so keyboard focus can move on;
- each card's links, the phone as a call link, and the blank phone case;
- the list's label and focus target;
- the server HTML: only the first window;
- an empty page.

The jsdom environment has no layout or page height. The tests give the list a position in the page and a page height of 20,000px, so scroll offsets behave as they would in a browser. A deliberate break of the scroll offset makes the resize test fail, which is how the test was checked.

**Browser (existing end-to-end suite, run in a real browser):** the header, pager and axe tests in `tests/e2e/mobile-scroll.spec.ts` and `tests/e2e/a11y.spec.ts`, plus a manual check of Tab, rotation and long names.

## 8. Rollout and revert

- No feature flag. The change is confined to one component and its tests.
- To revert, revert the implementation commit. The tests and docs stay correct against the old behaviour once the commit is reverted, so revert the docs with it.

## 9. Documents that change with this

- `docs/adr/0013-mobile-cards-virtualized.md` (accepted), and its row in `docs/adr/README.md`
- `docs/adr/0006-list-pagination-virtualization.md` gains a pointer to ADR-0013
- `docs/DECISIONS.md` gains row 35
- `docs/SPEC.md` (narrow viewports) describes the virtualized card list
- `docs/PLAN.md` (`ContactCards`) describes the virtualized card list
- `docs/RUNBOOK.md` (cards) describes the virtualized card list
- `docs/REVIEWER-GUIDE.md` (pagination row) covers the phone list too
