import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { secretKey, supabaseEnv } from '@/lib/env';
import type { Database } from './database.types';

const make = (headers?: Record<string, string>): SupabaseClient<Database> =>
  createClient<Database>(supabaseEnv().url, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });

// Sign-in only: forwards the browser's IP so Supabase rate-limits each reviewer, not Vercel.
export const createSignInClient = (clientIp: string | null) =>
  make(clientIp ? { 'Sb-Forwarded-For': clientIp } : undefined);
