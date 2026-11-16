import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Request-scoped, carries the viewer's JWT so RLS applies. There is no browser client.
export async function createServerSupabase(): Promise<
  SupabaseClient<Database>
> {
  const store = await cookies();
  return createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll(list) {
          // Server Components cannot set cookies; proxy.ts already refreshed the session.
          try {
            list.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
