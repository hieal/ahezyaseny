import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your environment variables.');
}

// Internal global client instance
let currentClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns the current active Supabase client.
 */
export const getSupabase = (): SupabaseClient => {
  return currentClient;
};

/**
 * Updates the global Supabase client with new credentials.
 */
export const setSupabase = (url: string, key: string): SupabaseClient => {
  currentClient = createClient(url, key);
  return currentClient;
};

/**
 * Creates a new Supabase client with custom credentials without updating the global one.
 */
export const createSupabaseClient = (url: string, key: string): SupabaseClient => {
  return createClient(url, key);
};

// For backward compatibility while migrating, we use a Proxy to always point to the currentClient
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    return (currentClient as any)[prop];
  }
});
