import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { secretKey, supabaseEnv } from '@/lib/env';
import type { Database } from './database.types';

const make = (headers?: Record<string, string>): SupabaseClient<Database> =>
  createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers },
    },
  );

// Sign-in only: forwards the browser's IP so Supabase rate-limits each reviewer, not Vercel.
export const createSignInClient = (clientIp: string | null) =>
  make(clientIp ? { 'Sb-Forwarded-For': clientIp } : undefined);

// Scripts and tests only; never import from app code.
export const createServiceClient = () => make();
