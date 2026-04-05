// Supabase client — only used for Storage (image uploads).
// Auth was migrated to native JWT (see AuthContext.tsx).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only initialise if both vars are present — createClient throws on empty strings.
// When missing, supabase is null and ImageUpload will gracefully fail.
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;
