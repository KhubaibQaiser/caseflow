# ADR-0014 — Drag pipeline cards between columns from 768px, on top of the Move menu

## Title

Add drag and drop between pipeline columns from 768px with dnd-kit, keeping the "Move to…" menu

## Status

`proposed`

## Date

2026-11-28

## Context

- **What the BRIEF asks.** Users must be able to move contacts from one status to another (G4). The "Move to…" menu from ADR-0005 does that and meets WCAG 2.2 SC 2.5.7, which requires a way to move without dragging.
- **What was ruled before.** ADR-0005 and DECISIONS row 29 (2026-11-17) kept drag and drop out of v1 and listed it as future work (SPEC §2, README, REVIEWER-GUIDE §5). Khubaib asked for it on 2026-11-28. This ADR amends only that part of ADR-0005. The menu and the column order stay.
- **Fixed: no manual order.** Columns are sorted by urgency, name or last update (`PIPELINE_SORTS`). There is no `position` column (spec decision 7). A drop therefore changes only the status, and `applyMove` puts the card where the target column's sort places it.
- **Fixed: bundle.** `/pipeline` first-load JS is 200.4 kB of the 250 kB budget (main CI, 2026-11-28, DECISIONS row 37).
- **Fixed: structure rules.** The ratchet in `scripts/check-frontend-structure.mjs` (DECISIONS row 36) only lets `board.tsx` and `column.tsx` keep or lose logic hooks, never gain them.
- **Fixed: CSP.** `style-src 'self' 'unsafe-inline'` allows the styles dnd-kit sets at runtime.
- **Khubaib's rulings in the interview (2026-11-28):**
  - drag works with any pointer from 768px: mouse, trackpad, pen or touch
  - it's built with dnd-kit, `@dnd-kit/react` pinned to an exact version
  - the whole card is the pointer target
  - keyboard drag is on, with screen-reader announcements, started from a Drag button that shows on focus
  - dnd-kit loads with the page
  - after a drop the user sees the same as after a menu move
  - a mistaken drop is moved back with the menu or another drag, and there is no Undo (row 29)
- **Unknown until built:**
  - how many gzipped kB dnd-kit adds to `/pipeline` (measured in PLAN T18c)
  - whether `@dnd-kit/react` keeps its API across 0.x minors (0.4.0 changed its event types)
  - how the keyboard drag sounds in VoiceOver (checked by hand in T18e)

## Options considered

### Option 1 — dnd-kit, `@dnd-kit/react` and `@dnd-kit/dom` 0.5.3, pinned (chosen)

- **Pros:**
  - One Pointer Events sensor covers mouse, pen and touch. Activation can differ by pointer type: 5px of movement for a mouse, a 250ms hold for touch, so a swipe still scrolls a column.
  - A keyboard sensor, plus an Accessibility plugin with custom announcements and instructions.
  - `DragOverlay` draws a copy of the card, so the card can leave its column's scroll box.
  - The docs call this package "Latest", and its peers are React 18 and 19.
- **Cons:**
  - It's pre-1.0, so a minor release can break the API. It's pinned exactly, and each Dependabot update gets a reviewed PR with the drag e2e suite.
  - A new dependency, of unmeasured size.
  - Keyboard movement is a fixed pixel offset per key press, so the board sets the offset to the measured column pitch, making one press one column.
  - The overlay is offset when an ancestor has a CSS transform (dnd-kit issue #1649), so it renders in a portal.

### Option 2 — dnd-kit's legacy package, `@dnd-kit/core` 6.3.1

- **Pros:** A stable API with many published examples, and coordinate getters for column-to-column keyboard moves.
- **Cons:** No release since 2024-12-05. The docs label it "Legacy", and its issues are being closed with a pointer to the rewrite, so bugs we hit would stay unfixed.

### Option 3 — The browser's built-in drag and drop (directly, or through Atlassian's Pragmatic drag and drop)

- **Pros:** No dependency (or a small one), and little bundle cost. Reliable with a mouse.
- **Cons:**
  - Each browser decides how a touch drag starts, so we can't tune the hold delay.
  - There's no keyboard path and no announcements. We'd write both, plus the enter and leave bookkeeping for the drop highlight.

### Option 4 — Keep the Move menu only

- **Pros:** Nothing to build, and it already meets 2.5.7.
- **Cons:** Mouse and touch users can't drag a card on a board, which Khubaib asked for.

## Decision

Option 1, chosen by Khubaib on 2026-11-28. It is the only option that drags by touch as well as by mouse, with a maintained keyboard sensor and announcements.

- **Where.** From 768px, where the board shows three columns, with any pointer. Below 768px cards don't drag and have no Drag button. A width change turns dragging on or off without a reload.
- **Who.** Only users with `contacts.write`. A Viewer's cards don't drag and have no Drag button. Their Move menu stays disabled, with the reason.
- **Pointer.** The whole card starts a drag: after 5px of movement with a mouse or pen, or after a 250ms hold (5px tolerance) with touch. These are the values dnd-kit's sensor guide gives. A click still opens the contact, and the phone link and Move menu work as they do now.
- **Keyboard.** Each card has a "Drag {name}" button, hidden until it has keyboard focus.
  - Space or Enter picks the card up, Left and Right move it one column, and Space or Enter drops it.
  - Escape or Tab cancels. Up and Down do nothing.
  - *(Claude's proposal: dnd-kit's default drops on Tab. Cancelling instead keeps the card where it was when focus leaves.)*
- **While dragging.**
  - An inert copy of the card follows the pointer, rendered in a portal, and the card in place dims.
  - The column under it is highlighted, except the card's own column. The highlight doesn't rely on colour alone.
  - The exact look comes from the mockup Khubaib approves (PLAN T18b).
- **Screen-reader announcements** *(copy proposed by Claude)*:
  - "Picked up {name} from {From}."
  - "{name} is over {To}." or "{name} is not over a column."
  - "{name} was not moved." on cancel, and "{name} stays in {From}." on a drop back.
  - A completed drop announces nothing itself, because the move toast says "{name} moved to {To}.".
- **Drop.** On another column, the move is the menu's optimistic move (`useBoardMoves`): the counts update, the toast shows, a failure rolls back with Retry, and focus goes where a menu move sends it. Dropping on the card's own column, outside the board, or cancelling does nothing and sends no request.
- **Motion.** The drop animation is 150ms ease-out, and there is none under `prefers-reduced-motion`.
- **Loading.** dnd-kit loads with the page and must fit the 250 kB budget.

## Consequences

- **New dependencies.** `@dnd-kit/react` and `@dnd-kit/dom`, both exactly 0.5.3. Khubaib adds them, because the dependency guard blocks agents.
- **ADR-0005.** Once this is accepted, its status reads `accepted (drag and drop amended by ADR-0014)`. The menu stays the single-pointer, no-drag path that 2.5.7 requires.
- **Keyboard cost.** Each card gains one more Tab stop, the Drag button.
- **Tests.**
  - e2e for mouse, touch, keyboard, Viewer, phone and resize.
  - Unit tests for the drop decision, the announcements and the column pitch.
  - axe while a card is picked up.
  - `pnpm size` keeps `/pipeline` at or under 250 kB.
- **Docs change when it ships (T18e).** README, REVIEWER-GUIDE §5, RUNBOOK "Why no drag and drop", and SPEC §8.6 and §8.11. Drag and drop leaves README's future work.
- **Dependabot.** Updates to dnd-kit are reviewed by hand. The drag e2e suite is the check.

## Rejected and why

- **Rejected: dnd-kit's older package.** It is stable, but it hasn't had a release since December 2024, and its maintainer now points issues to the rewrite, so a bug we found in it would stay unfixed.
- **Rejected: the browser's built-in drag and drop.** It costs almost nothing in bundle size, but each browser decides how a touch drag starts and it has no keyboard support, and this board has to work by touch on tablets and with the keyboard.
- **Rejected: keeping only the Move menu.** It already meets the accessibility rules, but people expect to drag cards on a board, and a drag is quicker than opening a menu for every move.

## Sources

- dnd kit, Migration guide (React) — https://dndkit.com/react/migration — read 2026-11-28
- dnd kit, Configuring sensors — https://dndkit.com/react/guides/sensors — read 2026-11-28
- dnd kit, DragOverlay — https://dndkit.com/react/components/drag-overlay — read 2026-11-28
- npm registry metadata for `@dnd-kit/react`, `@dnd-kit/dom` and `@dnd-kit/core` (versions, peers, publish dates) — https://www.npmjs.com/package/@dnd-kit/react — read 2026-11-28
- `@dnd-kit/react` 0.5.3 and `@dnd-kit/dom` 0.5.3 type declarations — https://unpkg.com/@dnd-kit/react@0.5.3/index.d.ts — read 2026-11-28
- dnd-kit issue #1649, DragOverlay offset under a transformed ancestor — https://github.com/clauderic/dnd-kit/issues/1649 — read 2026-11-28
- W3C, Understanding Success Criterion 2.5.7: Dragging Movements — https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html — read 2026-11-16
