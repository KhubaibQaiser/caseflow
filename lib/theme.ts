import { z } from 'zod';

import type { Theme } from './theme-label';

export const ThemeSchema = z.enum(['system', 'light', 'dark']);
export type { Theme } from './theme-label';

export const THEME_COOKIE = 'theme';
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Anything that is not a known theme is System. */
export function parseTheme(raw: unknown): Theme {
  const r = ThemeSchema.safeParse(raw);
  return r.success ? r.data : 'system';
}

/** The `data-theme` attribute value: none for System, so CSS prefers-color-scheme decides. */
export const themeAttr = (t: Theme) => (t === 'system' ? undefined : t);

/** The Set-Cookie-style string for document.cookie. Throws on a value outside the schema. */
export function themeCookie(theme: Theme, secure: boolean): string {
  const v = ThemeSchema.parse(theme);
  return `${THEME_COOKIE}=${v}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure ? '; Secure' : ''}`;
}

/** Reads the theme out of a document.cookie string. */
export function readThemeCookie(cookie: string): Theme {
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`));
  return parseTheme(m?.[1]);
}

export { themeLabel } from './theme-label';
