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
