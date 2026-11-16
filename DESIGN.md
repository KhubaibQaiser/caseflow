# Caseflow design system

Source of truth for values: `app/globals.css` (spec 8.13). Light mode only in v1. No component uses a colour literal; use tokens.

**Rule: warm colours mean urgency only.** Overdue and due-today use the warm pairs below. Nothing else (status, buttons, decoration) may be warm.

## Colour tokens

| Token                          | Value                 | Use                                                    |
| ------------------------------ | --------------------- | ------------------------------------------------------ |
| `--canvas`                     | `#F4F6F3`             | App background                                         |
| `--surface`                    | `#FFFFFF`             | Cards, table, panels                                   |
| `--panel`                      | `#FAFBF9`             | Side panels, table header                              |
| `--line`                       | `#E3E8E2`             | Borders                                                |
| `--line-soft`                  | `#EEF1ED`             | Row dividers                                           |
| `--ink`                        | `#1E2A26`             | Text                                                   |
| `--ink-2`                      | `#56645E`             | Secondary text                                         |
| `--accent`                     | `#1F5C4A`             | Primary action, links                                  |
| `--accent-soft`                | `#E6F0EB`             | Active pill, selection                                 |
| `--overdue` / `--overdue-bg`   | `#9E3426` / `#FCE8E4` | Overdue follow-ups                                     |
| `--today` / `--today-bg`       | `#7A4B00` / `#FFF1D6` | Due today                                              |
| `--lead-border`                | `#C3CEC8`             | Lead pill outline                                      |
| `--closed-bg`                  | `#ECEFED`             | Closed pill                                            |
| `--ring`                       | `#CFE3D9`             | Focus ring (3px)                                       |
| `--on-accent`                  | `#FFFFFF`             | Text on accent                                         |
| `--accent-hover`               | `#184A3B`             | Primary button hover                                   |
| `--lead-ink`                   | `#3D4A44`             | Lead pill text                                         |
| `--control-border`             | `#7F8D87`             | Input, checkbox, radio (3:1 on surface, panel, canvas) |
| `--track`                      | `#E9EEEA`             | Segmented track, icon hover                            |
| `--error-ring`                 | `#F8D7D1`             | Invalid control halo                                   |
| `--skeleton` / `--skeleton-hi` | `#ECF0ED` / `#F5F7F5` | Loading placeholders                                   |
| `--accent-on-ink`              | `#9FD3BC`             | Toast action on the ink toast                          |
| `--scrim`                      | ink at 38%            | Behind dialogs and sheets                              |

Status pills are neutral: Lead is an outline, Active is `accent-soft`, Closed is `closed-bg`.

## Type

Figtree 400/500/600/700 via `next/font/google`. Scale 12 / 13 / 14 / 16 / 20 / 24. Data uses `.tnum` (tabular numerals).

## Radii, shadow, spacing

Radii: 6 (`--r-ctl`, controls), 10 (`--r-surface`, surfaces), 999 (pills); menus, popovers and toasts use 8 as in the mockups. Shadows only on floating layers: `--float` (menus, popovers, dialog), `--float-ink` (toast), `--tip` (tooltip), `--sheet` (sheet), plus `--raised` for the checked segment. 4px spacing base.

Motion: overlays animate on Radix `data-state` (pop, fade, sheet slide; 150–200ms ease-out). Under `prefers-reduced-motion` the `--animate-*` tokens are `none`.

## States

Every component: default, hover, focus-visible, active, disabled, loading, error. Focus-visible is a 2px `--accent` outline (2px offset, 3:1 contrast, survives forced-colours) plus a 3px `--ring` halo. Selection, caret, scrollbar and underline offset are themed from tokens.
