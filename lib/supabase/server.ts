import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from '@/lib/env';
import type { Database } from './database.types';

// Request-scoped, carries the viewer's JWT so RLS applies. There is no browser client.
export async function createServerSupabase(): Promise<
  SupabaseClient<Database>
> {
  const store = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      // The cache headers go out from proxy.ts; a Server Component cannot set headers.
      setAll(list) {
        // Server Components cannot set cookies; proxy.ts already refreshed the session.
        try {
          list.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {}
      },
    },
  });
}
