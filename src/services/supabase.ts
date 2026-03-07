import { createClient } from '@supabase/supabase-js';

const localUrl = localStorage.getItem('supabase_url');
const localKey = localStorage.getItem('supabase_key');

const supabaseUrl = localUrl || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = localKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please check your .env file or Vercel settings.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder_key'
);
