# ADR-0005 — Move pipeline cards with a menu, ordered by urgency

## Title

Use a "Move to…" menu for pipeline moves, with no drag and drop, and order each column by urgency

## Status

`proposed`

## Date

2026-11-16

## Context

Spec decisions 6 and 7. The board needs one column per status, and contacts must move between them (G4). The target is WCAG 2.2 AA, and 2.5.7 requires that anything done by dragging can also be done with a single pointer without dragging. The product's first principle is urgency first. The deadline is 24 hours. Drag and drop is a non-goal for v1.

## Options considered

### Option 1 — "Move to…" menu only (chosen)

- **Pros:** Meets 2.5.7 by design. A Radix DropdownMenu is fully keyboard accessible. The same menu appears on the card and on the detail page. Moves are optimistic with Undo.
- **Cons:** Less direct than dragging for mouse users. Drag and drop has to be listed as future work.

### Option 2 — Drag and drop plus the menu

- **Pros:** Direct manipulation for pointer users, with the menu still meeting 2.5.7.
- **Cons:** An estimated 1.5 extra hours, inside a 24-hour deadline.

### Option 3 — Drag and drop only

- **Pros:** The familiar board interaction.
- **Cons:** Fails WCAG 2.5.7, because there is no way to move a card without dragging.

## Decision

Option 1. Chosen by Khubaib in the spec interview. A menu meets WCAG 2.5.7 by itself, and drag and drop can be added later on top of it without the 1.5 hours it would cost now.

Board order (decision 7) was Claude's proposal, and Khubaib did not object: overdue first, then due today, then soonest follow-up, then no follow-up, with ties going to the most recently updated. There is no manual ordering, so there is no `position` column.

## Consequences

- Cards show name, urgency pill, "matter · phone" and a Move to… menu. A move updates the card and the column counts through `useOptimistic`, shows "Name moved to Active · Undo" for about 6s, and rolls back with a Retry toast on failure (§8.6).
- Each column calls `search_contacts` with the status fixed, the default urgency sort, `page_size` 50 and "Show 50 more · N left" (§7.4).
- Users cannot hand-order cards within a column.
- Tests required by §9: component test for the Move to… menu with the keyboard; e2e for pipeline move, Undo and reload; axe on every route.
- README: "Menu versus drag and drop" under trade-offs, and drag and drop under "With more time" (§13).

## Rejected and why

- **Rejected: drag and drop together with the menu.** It would be friendlier for mouse users, but it was estimated at an hour and a half on a 24-hour deadline, and the menu already lets everyone move cards. It can be added later on top of the menu.
- **Rejected: drag and drop only.** People who cannot drag, including keyboard and many assistive-technology users, would have no way to move a card, which fails WCAG 2.2 success criterion 2.5.7.
- **Rejected: manual card ordering within a column.** It needs a stored rank column and drag and drop to set it, whereas ordering by urgency keeps what needs a call today at the top of each column without anyone maintaining it.

## Sources

- W3C, Understanding Success Criterion 2.5.7: Dragging Movements — https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html — read 2026-11-16
