import { createClient } from '@supabase/supabase-js';

const localUrl = localStorage.getItem('supabase_url');
const localKey = localStorage.getItem('supabase_key');

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabaseUrl = localUrl || envUrl || 'https://bdxddmsdkebxpfuirkmh.supabase.co';
const supabaseAnonKey = localKey || envKey || 'placeholder_key';
const supabaseServiceKey = serviceKey || supabaseAnonKey;

// Use a global object to store the singleton instances to prevent multiple initializations
const globalAny = window as any;

if (!globalAny.__supabase) {
  globalAny.__supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}

if (!globalAny.__supabaseAdmin) {
  globalAny.__supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export const supabase = globalAny.__supabase;
export const supabaseAdmin = globalAny.__supabaseAdmin;
