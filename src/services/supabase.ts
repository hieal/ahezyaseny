import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const localUrl = localStorage.getItem('supabase_url');
const localKey = localStorage.getItem('supabase_key');

// Prioritize environment variables for production/Vercel sync
const supabaseUrl = envUrl || localUrl || 'https://bdxddmsdkebxpfuirkmh.supabase.co';
const supabaseAnonKey = envKey || localKey || 'placeholder_key';
const supabaseServiceKey = serviceKey || supabaseAnonKey;

// Use a global object to store the singleton instances to prevent multiple initializations
const globalAny = window as any;

const clientOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'vercel-sync-fixed',
      'x-vercel-sync': 'true'
    }
  }
};

if (!globalAny.__supabase) {
  globalAny.__supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    clientOptions
  );
}

if (!globalAny.__supabaseAdmin) {
  globalAny.__supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      ...clientOptions,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export const supabase = globalAny.__supabase;
export const supabaseAdmin = globalAny.__supabaseAdmin;
