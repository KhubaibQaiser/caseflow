# Caseflow design system

Source of truth for values: `app/globals.css` (spec 8.13). Light mode only in v1. No component uses a colour literal; use tokens.

**Rule: warm colours mean urgency only.** Overdue and due-today use the warm pairs below. Nothing else (status, buttons, decoration) may be warm.

## Colour tokens

| Token                        | Value                 | Use                       |
| ---------------------------- | --------------------- | ------------------------- |
| `--canvas`                   | `#F4F6F3`             | App background            |
| `--surface`                  | `#FFFFFF`             | Cards, table, panels      |
| `--panel`                    | `#FAFBF9`             | Side panels, table header |
| `--line`                     | `#E3E8E2`             | Borders                   |
| `--line-soft`                | `#EEF1ED`             | Row dividers              |
| `--ink`                      | `#1E2A26`             | Text                      |
| `--ink-2`                    | `#56645E`             | Secondary text            |
| `--accent`                   | `#1F5C4A`             | Primary action, links     |
| `--accent-soft`              | `#E6F0EB`             | Active pill, selection    |
| `--overdue` / `--overdue-bg` | `#9E3426` / `#FCE8E4` | Overdue follow-ups        |
| `--today` / `--today-bg`     | `#7A4B00` / `#FFF1D6` | Due today                 |
| `--lead-border`              | `#C3CEC8`             | Lead pill outline         |
| `--closed-bg`                | `#ECEFED`             | Closed pill               |
| `--ring`                     | `#CFE3D9`             | Focus ring (3px)          |

Status pills are neutral: Lead is an outline, Active is `accent-soft`, Closed is `closed-bg`.

## Type

Figtree 400/500/600/700 via `next/font/google`. Scale 12 / 13 / 14 / 16 / 20 / 24. Data uses `.tnum` (tabular numerals).

## Radii, shadow, spacing

Radii: 6 (`--r-ctl`, controls), 10 (`--r-surface`, surfaces), 999 (pills). Shadows only on floating layers (menus, panel, toast). 4px spacing base.

## States

Every component: default, hover, focus-visible, active, disabled, loading, error. Focus-visible is the 3px `--ring`. Selection, caret, scrollbar and underline offset are themed from tokens.
