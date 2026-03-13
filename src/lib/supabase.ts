/**
 * INFRASTRUCTURE LAYER - Supabase Client
 *
 * High-level: The single Supabase client instance shared across the entire frontend.
 * Used by AuthContext for sign-up/sign-in/sign-out and by the api.ts interceptor
 * to attach the active JWT to every backend request.
 *
 * Low-level: Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the Vite
 * environment at build time. Warns (not throws) if either is missing so the app
 * can still boot in environments where Supabase isn’t configured yet.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Warn early if env vars are missing — silent failures here cause confusing 401s later.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
