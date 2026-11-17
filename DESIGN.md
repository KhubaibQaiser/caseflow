# Caseflow design system

Source of truth for values: `app/globals.css` (spec 8.13). Light and dark, both from tokens (System default). The tables below are light. No component uses a colour literal; use tokens.

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
| `--accent`                     | `#07557C`             | Primary action, links                                  |
| `--accent-soft`                | `#EBF5FA`             | Active pill, selection                                 |
| `--overdue` / `--overdue-bg`   | `#9E3426` / `#FCE8E4` | Overdue follow-ups                                     |
| `--today` / `--today-bg`       | `#7A4B00` / `#FFF1D6` | Due today                                              |
| `--lead-border`                | `#C3CEC8`             | Lead pill outline                                      |
| `--closed-bg`                  | `#ECEFED`             | Closed pill                                            |
| `--ring`                       | `#C3E7F9`             | Focus ring (3px)                                       |
| `--on-accent`                  | `#FAFDFF`             | Text on accent                                         |
| `--accent-hover`               | `#18709B`             | Primary button hover                                   |
| `--lead-ink`                   | `#3D4A44`             | Lead pill text                                         |
| `--control-border`             | `#7F8D87`             | Input, checkbox, radio (3:1 on surface, panel, canvas) |
| `--track`                      | `#E9EEEA`             | Segmented track, icon hover                            |
| `--error-ring`                 | `#F8D7D1`             | Invalid control halo                                   |
| `--skeleton` / `--skeleton-hi` | `#ECF0ED` / `#F5F7F5` | Loading placeholders                                   |
| `--accent-on-ink`              | `#93D5F5`             | Toast action on the ink toast                          |
| `--scrim`                      | ink at 38%            | Behind dialogs and sheets                              |

Status pills are neutral: Lead is an outline, Active is `accent-soft`, Closed is `closed-bg`.

## Type

Figtree 400/500/600/700 via `next/font/google`. Scale 12 / 13 / 14 / 16 / 20 / 24. Data uses `.tnum` (tabular numerals).

## Radii, shadow, spacing

Radii: 6 (`--r-ctl`, controls), 10 (`--r-surface`, surfaces and overlays: menus, popovers, dialogs, toasts), 999 (pills). One shadow, `--raised`, used only on floating layers and the checked segment. 4px spacing base.

Motion: overlays animate on Radix `data-state` (pop, fade, sheet slide; 150–200ms ease-out). Under `prefers-reduced-motion` the `--animate-*` tokens are `none`.

## States

Every component: default, hover, focus-visible, active, disabled, loading, error. Focus-visible is a 2px `--accent` outline (2px offset, 3:1 contrast, survives forced-colours) plus a 3px `--ring` halo. Selection, caret, scrollbar and underline offset are themed from tokens.

## Dark palette

Applied under `:root[data-theme='dark']` and, for System, under `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }`. The two blocks are identical (`lib/theme.test.ts`). Light is the base `:root`. Accent is blue in both themes; urgency stays warm.

| Token              | Dark      | Token                          | Dark                  |
| ------------------ | --------- | ------------------------------ | --------------------- |
| `--canvas`         | `#0F1512` | `--accent`                     | `#82CFF6`             |
| `--surface`        | `#161E1A` | `--accent-soft`                | `#133B4B`             |
| `--panel`          | `#121915` | `--accent-hover`               | `#C4EBFF`             |
| `--line`           | `#2A3631` | `--on-accent`                  | `#181B1C`             |
| `--line-soft`      | `#202A26` | `--ring`                       | `#2896CD`             |
| `--ink`            | `#E6ECE8` | `--accent-on-ink`              | `#07557C`             |
| `--ink-2`          | `#9FADA6` | `--overdue` / `--overdue-bg`   | `#FF9D8F` / `#3B1D19` |
| `--lead-border`    | `#4D5D56` | `--today` / `--today-bg`       | `#F0C368` / `#372A0D` |
| `--lead-ink`       | `#C3CFC9` | `--closed-bg`                  | `#242E29`             |
| `--control-border` | `#6E7E77` | `--track`                      | `#1F2924`             |
| `--error-ring`     | `#5A2A24` | `--skeleton` / `--skeleton-hi` | `#1F2924` / `#2A3631` |

Scrim is black at 60%; `--raised` and `--overlay` use black at 50%. The toast stays `--ink` on `--surface`, so it is a light toast in dark mode, and `--accent-on-ink` is the dark blue there. `color-scheme` follows the theme, which themes scrollbars and native controls.

Contrast, light / dark: accent on surface 8.1 / 9.9, on canvas 7.4 / 10.7, on accent-soft 7.3 / 7.0, on-accent on accent 7.9 / 10.1, on-accent on accent-hover 5.4 / 13.8, accent-on-ink on ink 9.3 / 6.7. Focus outline (accent vs canvas and surface) is above 7 in both. Every pair clears 4.5:1 text and 3:1 UI.

## Theme control

One icon button, top-right on every screen (the right of the mobile top bar below 768px, `/login` top-right corner). The icon shows the selection: monitor for System, sun for Light, moon for Dark. Menu: Theme label, then System, Light, Dark as `menuitemradio`. Label and tooltip: "Theme: System (dark)", "Theme: Light". The choice lives in a `theme` cookie that the root layout turns into `<html data-theme>`. Favicon, `app/icon.svg` and `app/apple-icon.png` carry the accent.
