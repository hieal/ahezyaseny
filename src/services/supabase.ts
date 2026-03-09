import { createClient } from '@supabase/supabase-js';

const localUrl = localStorage.getItem('supabase_url');
const localKey = localStorage.getItem('supabase_key');

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabaseUrl = localUrl || envUrl;
const supabaseAnonKey = localKey || envKey;
const supabaseServiceKey = serviceKey; // Usually not stored in localStorage for security

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file or Vercel settings.');
} else {
  console.log(`Supabase connecting using: ${localUrl ? 'Local Storage' : 'Environment Variables'}`);
}

export const supabase = createClient(
  supabaseUrl || 'https://bdxddmsdkebxpfuirkmh.supabase.co',
  supabaseAnonKey || 'placeholder_key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Administrative client that bypasses RLS if service key is provided
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://bdxddmsdkebxpfuirkmh.supabase.co',
  supabaseServiceKey || supabaseAnonKey || 'placeholder_key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
