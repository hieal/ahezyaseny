import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Use global variables to ensure singletons across HMR or multiple imports
const globalAny = globalThis as any;

if (!globalAny.__supabase) {
  console.log('[Supabase] Initializing main client with persistSession: true');
  globalAny.__supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  });
}

if (!globalAny.__supabaseAdmin) {
  console.log('[Supabase] Initializing admin client with persistSession: false');
  globalAny.__supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

export const supabase: SupabaseClient = globalAny.__supabase;
export const supabaseAdmin: SupabaseClient = globalAny.__supabaseAdmin;

export { createClient };
