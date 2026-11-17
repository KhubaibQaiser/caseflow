import type { Theme } from '@/lib/theme-label';

// The html attribute is the source of truth, so every mounted toggle (top bar and corner) agrees.
const listeners = new Set<() => void>();
export const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
export const notify = () => listeners.forEach((l) => l());

export const readTheme = (): Theme => {
  const t = document.documentElement.dataset.theme;
  return t === 'light' || t === 'dark' ? t : 'system';
};

const DARK_MQ = '(prefers-color-scheme: dark)';
export const subscribeDark = (cb: () => void) => {
  const mq = matchMedia(DARK_MQ);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
export const readDark = () => matchMedia(DARK_MQ).matches;
