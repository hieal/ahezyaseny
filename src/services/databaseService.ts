import { getSupabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { SupabaseClient } from '@supabase/supabase-js';

const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE,
    password_plain TEXT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'admin',
    status TEXT DEFAULT 'active',
    category TEXT,
    secondary_category TEXT,
    gender TEXT,
    phone TEXT,
    google_login_allowed TEXT DEFAULT 'true',
    avatar_url TEXT,
    is_from_file INTEGER DEFAULT 0,
    is_approved INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    password_updated_at TIMESTAMPTZ
);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    name TEXT,
    age INTEGER,
    height TEXT,
    ethnicity TEXT,
    marital_status TEXT,
    city TEXT,
    religious_level TEXT,
    service TEXT,
    occupation TEXT,
    about TEXT,
    looking_for TEXT,
    smoking TEXT,
    negiah TEXT,
    age_range TEXT,
    type TEXT, -- 'male' or 'female'
    created_by INTEGER REFERENCES admins(id),
    creator_name TEXT,
    creator_phone TEXT,
    creator_gender TEXT,
    last_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- WhatsApp Groups Table
CREATE TABLE IF NOT EXISTS whatsapp_groups (
    id SERIAL PRIMARY KEY,
    name TEXT,
    link TEXT,
    whapi_id TEXT,
    category TEXT,
    type TEXT -- 'male' or 'female'
);

-- Internal Messages Table
CREATE TABLE IF NOT EXISTS internal_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES admins(id),
    receiver_id INTEGER REFERENCES admins(id),
    text TEXT,
    match_id INTEGER REFERENCES matches(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES admins(id),
    text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking Logs Table
CREATE TABLE IF NOT EXISTS tracking_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES admins(id),
    action TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Iron User if not exists
INSERT INTO admins (username, password_plain, email, role, status, is_approved, avatar_url)
VALUES ('good', 'good', 'admin@shidduchim.com', 'super_admin', 'active', 1, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix')
ON CONFLICT (username) DO UPDATE SET
  avatar_url = COALESCE(admins.avatar_url, 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix');

-- Insert default settings
INSERT INTO settings (key, value) VALUES ('iron_username', 'good') ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('iron_password', 'good') ON CONFLICT (key) DO NOTHING;
`;

export class DatabaseService {
  /**
   * Checks if the database is initialized and attempts to initialize it if not.
   * Note: This requires a 'exec_sql' RPC function to be defined in Supabase.
   */
  static async ensureInitialized(customClient?: SupabaseClient) {
    const client = customClient || getSupabase();
    try {
      // 1. Check if admins table exists by trying a simple query
      const { error } = await client.from('admins').select('id').limit(1);
      
      if (error && (error.code === '42P01' || error.message.includes('relation "admins" does not exist'))) {
        console.log('Database not initialized. Attempting auto-initialization...');
        return await this.initializeDatabase(client);
      }
      
      // 2. Ensure 'good' user has an avatar (fix for existing databases)
      const { data: goodUser } = await client.from('admins').select('avatar_url').eq('username', 'good').single();
      if (goodUser && !goodUser.avatar_url) {
        await client.from('admins').update({ 
          avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix' 
        }).eq('username', 'good');
      }

      // 3. Ensure 'created_by' column exists in admins table
      const { error: colError } = await client.from('admins').select('created_by').limit(1);
      if (colError && colError.message.includes('does not exist')) {
        console.log('Adding missing created_by column to admins table...');
        await client.rpc('exec_sql', { 
          sql: 'ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES admins(id);' 
        });
      }

      return true;
    } catch (err) {
      console.error('Error checking database status:', err);
      return false;
    }
  }

  static async initializeDatabase(customClient?: SupabaseClient) {
    const client = customClient || getSupabase();
    try {
      // We attempt to call a generic SQL execution RPC.
      // If the user hasn't set this up, we'll provide instructions.
      const { error } = await client.rpc('exec_sql', { sql: SCHEMA_SQL });

      if (error) {
        console.error('Failed to initialize database via RPC:', error);
        
        // If RPC fails, it's likely because 'exec_sql' doesn't exist.
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          toast.error('שגיאת אתחול: פונקציית exec_sql חסרה בסופאבייס.', { duration: 6000 });
          console.warn(`
            MANDATORY SETUP REQUIRED:
            To enable fully automated database initialization, please run the following SQL in your Supabase SQL Editor ONCE:

            CREATE OR REPLACE FUNCTION exec_sql(sql text)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              EXECUTE sql;
            END;
            $$;
          `);
        } else {
          toast.error(`שגיאה באתחול המסד: ${error.message}`);
        }
        return false;
      }

      toast.success('המסד אותחל בהצלחה! משתמש הברזל (good) נוצר.');
      return true;
    } catch (err) {
      console.error('Critical error during database initialization:', err);
      return false;
    }
  }
}
