// No zod here: this is on every page's first load (the theme button). Zod lives in lib/theme.ts, which loads with the menu.
export type Theme = 'system' | 'light' | 'dark';

/** aria-label and tooltip. systemDark is null until the browser has told us (server render). */
export function themeLabel(theme: Theme, systemDark: boolean | null): string {
  if (theme === 'light') return 'Theme: Light';
  if (theme === 'dark') return 'Theme: Dark';
  if (systemDark === null) return 'Theme: System';
  return `Theme: System (${systemDark ? 'dark' : 'light'})`;
}
