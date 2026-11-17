import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  parseTheme,
  readThemeCookie,
  themeAttr,
  themeCookie,
  themeLabel,
} from './theme';
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from './theme-colors';

describe('theme cookie', () => {
  it('parses known values and falls back to system', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('system')).toBe('system');
    expect(parseTheme('purple')).toBe('system');
    expect(parseTheme(undefined)).toBe('system');
  });

  it('reads from a document.cookie string', () => {
    expect(readThemeCookie('a=1; theme=dark; b=2')).toBe('dark');
    expect(readThemeCookie('theme=nope')).toBe('system');
    expect(readThemeCookie('')).toBe('system');
  });

  it('sets a one-year, Lax cookie, Secure only in production, never HttpOnly', () => {
    const dev = themeCookie('dark', false);
    expect(dev).toBe('theme=dark; Path=/; Max-Age=31536000; SameSite=Lax');
    expect(themeCookie('light', true)).toContain('; Secure');
    expect(dev).not.toContain('HttpOnly');
  });

  it('refuses a value outside the schema', () => {
    expect(() => themeCookie('blue' as never, false)).toThrow();
  });

  it('has no attribute for system', () => {
    expect(themeAttr('system')).toBeUndefined();
    expect(themeAttr('dark')).toBe('dark');
  });
});

describe('themeLabel', () => {
  it.each([
    ['light', null, 'Theme: Light'],
    ['dark', false, 'Theme: Dark'],
    ['system', null, 'Theme: System'],
    ['system', true, 'Theme: System (dark)'],
    ['system', false, 'Theme: System (light)'],
  ] as const)('%s / %s -> %s', (t, dark, label) => {
    expect(themeLabel(t, dark)).toBe(label);
  });
});

describe('globals.css dark palette', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  const grab = (text: string, re: RegExp) => {
    const m = re.exec(text);
    if (!m?.[1]) throw new Error(`no match for ${re}`);
    return m[1];
  };
  const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
  const lightBlock = grab(css, /:root\s*\{([^}]*)\}/);
  const explicit = squash(
    grab(css, /:root\[data-theme='dark'\]\s*\{([^}]*)\}/),
  );
  const media = squash(
    grab(
      css,
      /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme='light'\]\)\s*\{([^}]*)\}/,
    ),
  );

  it('the explicit and the System dark blocks are identical', () => {
    expect(media).toBe(explicit);
    expect(explicit).toContain('color-scheme: dark');
  });

  it('overrides every light colour token', () => {
    const names = [...lightBlock.matchAll(/--([a-z0-9-]+):/g)]
      .map((m) => m[1])
      .filter((n): n is string => !!n && !/^(r-|tabbar)/.test(n));
    for (const n of names) expect(explicit, n).toContain(`--${n}:`);
  });

  it('keeps themeColor in step with --canvas', () => {
    const canvas = (s: string) => grab(s, /--canvas:\s*(#[0-9a-f]{6})/i);
    expect(canvas(lightBlock)).toBe(THEME_COLOR_LIGHT);
    expect(canvas(explicit)).toBe(THEME_COLOR_DARK);
  });
});
