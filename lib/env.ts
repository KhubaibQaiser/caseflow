import { z } from 'zod';

const Public = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});
const Secret = z.object({ SUPABASE_SECRET_KEY: z.string().min(1) });

function read<T extends z.ZodType>(schema: T): z.infer<T> {
  const r = schema.safeParse(process.env);
  if (r.success) return r.data;
  const names = r.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Missing or invalid environment variable: ${names}`);
}

export function supabaseEnv() {
  const e = read(Public);
  return { url: e.SUPABASE_URL, key: e.SUPABASE_PUBLISHABLE_KEY };
}

export const secretKey = () => read(Secret).SUPABASE_SECRET_KEY;

// On unless explicitly "false": a missing variable must never switch sign-in off.
export const authEnforced = () => process.env.AUTH_ENFORCED !== 'false';

// The /dev fixtures are for development and for e2e (a production build run with E2E_DEV_ROUTES=1).
// Vercel previews and production are both NODE_ENV=production, so both 404 them.
export const devRoutesEnabled = () =>
  process.env.NODE_ENV !== 'production' || process.env.E2E_DEV_ROUTES === '1';
