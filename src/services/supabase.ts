import { createClient } from '@supabase/supabase-js';

const localUrl = localStorage.getItem('supabase_url');
const localKey = localStorage.getItem('supabase_key');

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = localUrl || envUrl;
const supabaseAnonKey = localKey || envKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file or Vercel settings.');
} else {
  console.log(`Supabase connecting using: ${localUrl ? 'Local Storage' : 'Environment Variables'}`);
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder_key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: (url, options) => {
        return window.fetch(url, options);
      },
    },
  }
);
