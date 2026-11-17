import { z } from 'zod';

// Set by a form right before it pushes /login after an expiry, so /login knows Back
// leads to that form's saved draft. Same tab only, no values, read safely when blocked.
const KEY = 'caseflow:return';
const MAX_AGE_MS = 10 * 60_000;
const Marker = z.object({ next: z.string(), at: z.number() });

export function markReturn(next: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ next, at: Date.now() }));
  } catch {}
}

export function hasReturn(next: string | undefined): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw || !next) return false;
    const m = Marker.safeParse(JSON.parse(raw));
    return (
      m.success && m.data.next === next && Date.now() - m.data.at < MAX_AGE_MS
    );
  } catch {
    return false;
  }
}

export function clearReturn(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
