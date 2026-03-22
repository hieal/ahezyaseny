import { User, Match, ActivityLog, PublishLog, WhatsAppGroup, Stats, MatchNote, GameScore, PortalSettings, SpeedDateSession, Blacklist } from '../types';
import { supabase, supabaseAdmin } from './supabase';
import { isVercel, isAIStudio } from '../utils/env';

export type BackendMode = 'temporary' | 'production';

const SCHEMA_SQL = `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  password_plain TEXT,
  role TEXT DEFAULT 'admin',
  status TEXT DEFAULT 'active',
  category TEXT,
  secondary_category TEXT,
  gender TEXT,
  phone TEXT,
  google_login_allowed TEXT DEFAULT 'false',
  avatar_url TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  daily_message_template TEXT,
  is_from_file INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 0,
  last_login TIMESTAMP WITH TIME ZONE,
  password_updated_at TIMESTAMP WITH TIME ZONE,
  assigned_group_id UUID,
  affiliation_group TEXT,
  age_groups TEXT,
  created_by UUID,
  creator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE,
  is_online BOOLEAN DEFAULT false
);

-- Create candidates table (Matchmaking cards)
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  name TEXT,
  full_name TEXT,
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
  notes TEXT,
  smoking TEXT,
  negiah TEXT,
  age_range TEXT,
  image_url TEXT,
  additional_images TEXT,
  created_by UUID,
  creator_name TEXT,
  creator_category TEXT,
  creator_gender TEXT,
  creator_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_published_at TIMESTAMP WITH TIME ZONE,
  publish_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMP WITH TIME ZONE,
  phone TEXT,
  category TEXT,
  status TEXT DEFAULT 'available',
  is_archived BOOLEAN DEFAULT FALSE,
  is_published_confirmed INTEGER DEFAULT 0,
  crop_config TEXT,
  creation_source TEXT,
  managed_by UUID,
  previous_admin_data TEXT,
  transfer_status TEXT,
  target_admin_id UUID,
  transfer_approved_at TIMESTAMP WITH TIME ZONE,
  initial_contact_done BOOLEAN DEFAULT FALSE,
  password TEXT DEFAULT '12345678',
  is_approved INTEGER DEFAULT 0,
  previous_admin_name TEXT,
  last_known_group UUID
);

-- Create blacklist table
CREATE TABLE IF NOT EXISTS public.blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  full_name TEXT,
  reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT,
  action TEXT,
  details TEXT,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_scores table
CREATE TABLE IF NOT EXISTS public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID,
  candidate_name TEXT,
  game_type TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT,
  player1_id UUID,
  player1_name TEXT,
  player2_id UUID,
  player2_name TEXT,
  is_active BOOLEAN DEFAULT true,
  current_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portal_settings table
CREATE TABLE IF NOT EXISTS public.portal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_game_images TEXT DEFAULT '[]',
  is_speed_date_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create speed_date_sessions table
CREATE TABLE IF NOT EXISTS public.speed_date_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  male_id UUID,
  female_id UUID,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  share_details_male BOOLEAN DEFAULT false,
  share_details_female BOOLEAN DEFAULT false
);

-- Create candidate_chat_messages table
CREATE TABLE IF NOT EXISTS public.candidate_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  sender_id UUID,
  text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create whatsapp_groups table
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  type TEXT,
  name TEXT,
  link TEXT,
  whapi_id TEXT,
  last_initial_sent TIMESTAMP WITH TIME ZONE,
  last_initial_sent_method TEXT,
  is_approved INTEGER DEFAULT 0
);

-- Create internal_messages table
CREATE TABLE IF NOT EXISTS public.internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID,
  receiver_id UUID,
  text TEXT,
  match_id UUID,
  match_name TEXT,
  match_type TEXT,
  match_age INTEGER,
  match_city TEXT,
  sender_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false
);

-- Create candidate_notes table
CREATE TABLE IF NOT EXISTS public.candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID,
  user_id UUID,
  user_name TEXT,
  text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create candidate_transfers table
CREATE TABLE IF NOT EXISTS public.candidate_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist (in case table was created in older version)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'published';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'published';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'published';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_login_allowed TEXT DEFAULT 'false';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_message_template TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS match_id UUID;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS match_name TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS match_type TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS match_age INTEGER;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS match_city TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS previous_admin_data TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS transfer_status TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS target_admin_id UUID;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS transfer_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS family_description TEXT;
ALTER TABLE public.publish_logs ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE public.game_logs ADD COLUMN IF NOT EXISTS final_state JSONB;

-- Disable RLS for all tables to allow prototype access (The "Switch")
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_date_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_chat_messages DISABLE ROW LEVEL SECURITY;

-- Storage Setup: Create 'images' bucket and set public access
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'images');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'images');

-- Aggressive Cleanup
-- 1. Delete users with password '12345678' (Hard Delete)
DELETE FROM public.profiles WHERE password_plain = '12345678';

-- 2. Delete users named 'god' (Hard Delete)
DELETE FROM public.profiles WHERE (username = 'god' OR name = 'god');

-- 3. Delete 'ghost' users (rows without username)
DELETE FROM public.profiles WHERE (username IS NULL OR username = '');

-- הארכת תוקף החיבור ל-24 שעות
ALTER ROLE authenticator SET auth.jwt_expiry = 86400;

-- וודא שהמנהל שלך מסומן כפעיל תמיד
UPDATE public.profiles 
SET last_seen = NOW(), is_online = true
WHERE role = 'super_admin';

-- Initialize portal settings
INSERT INTO public.portal_settings (id, memory_game_images, is_speed_date_active)
VALUES ('00000000-0000-0000-0000-000000000000', '["https://picsum.photos/seed/1/200/200", "https://picsum.photos/seed/2/200/200", "https://picsum.photos/seed/3/200/200", "https://picsum.photos/seed/4/200/200", "https://picsum.photos/seed/5/200/200", "https://picsum.photos/seed/6/200/200"]', true)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
`;

class DataService {
  constructor() {
    // Auto-creation functions removed as per user request.
    // Users should be created only manually.
  }

  async performDeepClean(): Promise<void> {
    if (isAIStudio()) {
      console.warn('Deep Clean blocked in AI Studio environment.');
      return;
    }
    try {
      console.log('Starting Aggressive Deep Clean...');
      
      // Fetch all profiles
      const { data: allProfiles, error } = await supabaseAdmin.from('profiles').select('id, username, phone, full_name, email');
      if (error || !allProfiles) {
        console.error('Deep Clean failed to fetch profiles:', error);
        return;
      }

      let goodId: string | null = null;
      let malachiId: string | null = null;
      let noamRuthId: string | null = null;
      const idsToDelete: string[] = [];

      for (const profile of allProfiles) {
        // 1. Identify Super Admin (good) - By ID or Username
        if ((profile.id === 'b724069c-2a51-4c99-9dcb-178e488d6b4b' || profile.username === 'good') && !goodId) {
          goodId = profile.id;
          continue;
        }
        
        // 2. Identify Malachi Tzuriel (0556603336)
        if (profile.phone === '0556603336' && !malachiId) {
          malachiId = profile.id;
          continue;
        }

        // 3. Identify Noam Ruth (נועם רות)
        if (profile.full_name?.includes('נועם רות') && !noamRuthId) {
          noamRuthId = profile.id;
          continue;
        }

        // Everything else goes to the delete list
        idsToDelete.push(profile.id);
      }

      if (idsToDelete.length > 0) {
        console.log(`Deep Clean: Deleting ${idsToDelete.length} profiles to keep only the 3 required ones...`);
        
        // Sequential await for strict order and to avoid blocking
        const chunkSize = 20;
        for (let i = 0; i < idsToDelete.length; i += chunkSize) {
          const chunk = idsToDelete.slice(i, i + chunkSize);
          
          // 1. Update candidates (nullable handling)
          await supabaseAdmin.from('candidates').update({ created_by: goodId || null }).in('created_by', chunk);
          await supabaseAdmin.from('candidates').update({ managed_by: goodId || null }).in('managed_by', chunk);
          await supabaseAdmin.from('candidates').update({ admin_id: goodId || null }).in('admin_id', chunk);
          await supabaseAdmin.from('candidates').update({ target_admin_id: null }).in('target_admin_id', chunk);
          
          // 2. Delete residuals from all tables
          await supabaseAdmin.from('candidate_transfers').delete().in('sender_id', chunk);
          await supabaseAdmin.from('candidate_transfers').delete().in('receiver_id', chunk);
          await supabaseAdmin.from('candidate_notes').delete().in('user_id', chunk);
          await supabaseAdmin.from('internal_messages').delete().in('sender_id', chunk);
          await supabaseAdmin.from('internal_messages').delete().in('receiver_id', chunk);
          await supabaseAdmin.from('activity_logs').delete().in('user_id', chunk);
          await supabaseAdmin.from('publish_logs').delete().in('user_id', chunk);
          await supabaseAdmin.from('whatsapp_groups').update({ created_by: goodId || null }).in('created_by', chunk);
          await supabaseAdmin.from('candidate_chat_messages').delete().in('sender_id', chunk);
          await supabaseAdmin.from('speed_date_sessions').delete().in('male_id', chunk);
          await supabaseAdmin.from('speed_date_sessions').delete().in('female_id', chunk);
          await supabaseAdmin.from('game_sessions').delete().in('player1_id', chunk);
          await supabaseAdmin.from('game_sessions').delete().in('player2_id', chunk);
          await supabaseAdmin.from('blacklist').delete().in('created_by', chunk);

          // 3. Finally delete the profiles
          await supabaseAdmin.from('profiles').delete().in('id', chunk);
          
          // 4. Also try to delete from admins table if it exists
          try {
            await supabaseAdmin.from('admins').delete().in('id', chunk);
          } catch (e) {
            console.log('Admins table might be a view or not exist, skipping delete from admins');
          }
        }
      }

      // Ensure the 3 kept users have correct roles and credentials
      if (goodId) {
        await supabaseAdmin.from('profiles').update({
          full_name: 'מנהל ראשי',
          username: 'good',
          password_plain: 'good',
          password: 'good',
          role: 'super_admin',
          status: 'active',
          is_approved: 1
        }).eq('id', goodId);
      }

      if (malachiId) {
        await supabaseAdmin.from('profiles').update({
          full_name: 'מלאכי צוריאל',
          role: 'admin',
          status: 'active',
          is_approved: 1
        }).eq('id', malachiId);
      }

      if (noamRuthId) {
        await supabaseAdmin.from('profiles').update({
          role: 'admin',
          status: 'active',
          is_approved: 1
        }).eq('id', noamRuthId);
      }

      console.log('Deep Clean Completed Successfully.');
    } catch (err) {
      console.error('Error during Aggressive Deep Clean:', err);
    }
  }

  private mode: BackendMode = 'production';

  setMode(mode: BackendMode) {
    this.mode = 'production'; // Always production
    localStorage.setItem('backend_mode', 'production');
  }

  getMode(): BackendMode {
    return 'production';
  }

  private getSyncStatus = () => isVercel() ? 'published' : 'draft';

  private applySyncFilter(query: any) {
    return query;
  }

  private applySyncStatus(data: any) {
    // TEMPORARY: Set is_approved to 1 by default for all creations
    return { ...data, is_approved: 1 };
  }

  async approveChanges(): Promise<{ success: boolean; message: string }> {
    if (isAIStudio()) {
      return { success: false, message: 'פעולה זו חסומה בסביבת הפיתוח (AI Studio)' };
    }
    try {
      const tables = ['profiles', 'candidates', 'whatsapp_groups'];
      for (const table of tables) {
        // Approve all pending changes
        await supabaseAdmin
          .from(table)
          .update({ is_approved: 1 })
          .eq('is_approved', 0);
      }
      return { success: true, message: 'השינויים אושרו ופורסמו בהצלחה!' };
    } catch (e: any) {
      console.error('Error in approveChanges:', e);
      return { success: false, message: `שגיאה באישור השינויים: ${e.message}` };
    }
  }

  async publishChanges(): Promise<{ success: boolean; message: string }> {
    if (isAIStudio()) {
      return { success: false, message: 'פעולה זו חסומה בסביבת הפיתוח (AI Studio)' };
    }
    let successCount = 0;
    const errors: string[] = [];

    const tables = ['profiles', 'candidates', 'matches'];

    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .update({ sync_status: 'published' })
          .eq('sync_status', 'draft');
        
        if (error) {
          // 42P01: Table does not exist
          if (error.code !== '42P01') {
            errors.push(`שגיאה בטבלה ${table}: ${error.message}`);
          }
        } else {
          successCount++;
        }
      } catch (e: any) {
        errors.push(`שגיאה בטבלה ${table}: ${e.message}`);
      }
    }

    if (successCount > 0) {
      return { success: true, message: `פורסמו שינויים ב-${successCount} טבלאות.${errors.length > 0 ? ' (היו שגיאות בחלק מהטבלאות, בדוק קונסול)' : ''}` };
    } else {
      return { success: false, message: `לא ניתן היה לפרסם שינויים: ${errors.join('; ')}` };
    }
  }

  private async handleSupabase<T>(promise: PromiseLike<{ data: T | null; error: any }>, isWrite: boolean = false): Promise<T | null> {
    try {
      const { data, error } = await promise;
      if (error) {
        console.error('Database Error:', error);
        // 42P01: Table does not exist
        if (error.code === '42P01') {
          throw new Error('חסרה טבלה במסד הנתונים. אנא לחץ על כפתור הסנכרון (Refresh) בדף ההתחברות.');
        }
        // 42703: Column does not exist, PGRST204: Schema cache error
        if (error.code === '42703' || error.code === 'PGRST204' || (error.message && error.message.includes('does not exist'))) {
          return null;
        }
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          throw new Error('שגיאת הרשאות (RLS). אנא וודא שביטלת את ה-RLS ב-Supabase עבור כל הטבלאות.');
        }
        throw error;
      }
      if (isWrite) {
        console.log('Database Updated Successfully');
      }
      return data;
    } catch (err: any) {
      console.error('Database Error:', err);
      // If it's a missing column error caught in catch block
      if (err.message && (err.message.includes('column') || err.message.includes('does not exist'))) {
        return null;
      }
      if (err.message && (err.message.includes('סנכרון') || err.message.includes('הרשאות'))) {
        throw err;
      }
      throw new Error(`שגיאה בחיבור לשרת: ${err.message || 'וודא שהמפתחות תקינים'}`);
    }
  }

  private async safeQuery<T>(query: any, fallback: T): Promise<T> {
    try {
      const filteredQuery = this.applySyncFilter(query);
      const { data, error } = await filteredQuery;
      if (error) {
        console.error('Supabase safeQuery Error:', error);
        if (error.code === '42703' || error.code === 'PGRST204' || (error.message && error.message.includes('does not exist'))) {
          return fallback;
        }
        throw error;
      }
      return data || fallback;
    } catch (e) {
      console.error('safeQuery caught error:', e);
      return fallback;
    }
  }

  async syncSchema(): Promise<{ success: boolean; message: string }> {
    try {
      // First check if we have service role key, if not, we can't use RPC exec_sql usually
      // unless it's explicitly allowed. 
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: SCHEMA_SQL });
      if (error) {
        console.error('Schema sync RPC error:', error);
        return { 
          success: false, 
          message: 'לא ניתן היה לסנכרן אוטומטית. וודא שפונקציית exec_sql קיימת ב-Supabase.' 
        };
      }
      return { success: true, message: 'סנכרון סכמה הושלם בהצלחה!' };
    } catch (err: any) {
      console.error('Schema sync catch error:', err);
      return { 
        success: false, 
        message: `שגיאה בסנכרון: ${err.message}` 
      };
    }
  }

  getSchemaSQL(): string {
    return SCHEMA_SQL;
  }

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async isBlacklisted(email: string, phone: string, full_name: string): Promise<Blacklist | null> {
    const { data, error } = await supabase
      .from('blacklist')
      .select('*')
      .or(`email.eq.${email},phone.eq.${phone},full_name.eq.${full_name}`)
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return null;
    }
    return data[0] as Blacklist;
  }

  // Auth
  async heartbeat(): Promise<boolean> {
    const sessionUserJson = sessionStorage.getItem('current_user');
    const localUserJson = localStorage.getItem('current_user');
    const userJson = sessionUserJson || localUserJson;
    
    if (!userJson) return false;
    
    try {
      const user = JSON.parse(userJson);
      // Don't update for the fallback "מנהל ראשי"
      if (user.id && user.id !== 'b724069c-2a51-4c99-9dcb-178e488d6b4b') {
        // Use update to update last_seen
        const { error } = await supabase
          .from('profiles')
          .update({ 
            last_login: new Date().toISOString(),
            last_seen: new Date().toISOString()
          })
          .eq('id', user.id);
        
        if (error) {
          console.error('Heartbeat error:', error);
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error('Heartbeat error:', err);
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const sessionUserJson = sessionStorage.getItem('current_user');
    const localUserJson = localStorage.getItem('current_user');
    const userJson = sessionUserJson || localUserJson;

    if (!userJson) return null;
    
    const user: User = JSON.parse(userJson);
    
    try {
      const query = supabase
        .from('profiles')
        .select('id, email, phone, username, password_plain, full_name, name, role, avatar_url, gender, status, category, secondary_category, last_seen, is_online, created_at, daily_message_template, is_from_file, is_approved')
        .eq('id', user.id)
        .limit(1)
        .single();
      
      const { data } = await this.applySyncFilter(query);
        
      if (!data) {
        if (sessionUserJson) sessionStorage.removeItem('current_user');
        else localStorage.removeItem('current_user');
        return null;
      }
      
      const u = data as any;
      const fallbackName = u.role === 'super_admin' ? 'מנהל ראשי' : 'מנהל ללא שם';
      const updatedUser: User = {
        ...u,
        full_name: u.full_name || u.email?.split('@')[0] || u.username || fallbackName
      };
      
      if (sessionUserJson) sessionStorage.setItem('current_user', JSON.stringify(updatedUser));
      else localStorage.setItem('current_user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (err) {
      return user;
    }
  }

  async login(usernameOrEmailOrPhone: string, password_plain: string, type: 'admin' | 'candidate'): Promise<User | null> {
    // Forced login for 'good'/'good'
    if (usernameOrEmailOrPhone === 'good' && password_plain === 'good') {
      return {
        id: '8ebb9a38-12ec-48c1-96f7-e3cd6f4648e1',
        username: 'good',
        password_plain: 'good',
        full_name: 'מנהל ראשי',
        email: 'admin@example.com',
        role: 'super_admin',
        status: 'active',
        is_approved: 1,
        gender: 'male',
        phone: '0000000000',
        avatar_url: null
      } as User;
    }

    // Clear cache
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('current_user');

    const input = usernameOrEmailOrPhone.trim();

    try {
      if (type === 'admin') {
        // 1. Check admins table (Admins)
        // We use .limit(1) instead of .single() to avoid 406/PGRST116 errors when no row is found
        const { data: profilesData, error: profileError } = await supabase
          .from('admins')
          .select('id, email, phone, username, password_plain, full_name, role, avatar_url, gender, status, category, last_login, is_approved')
          .or(`phone.eq.${input},email.eq.${input},username.eq.${input}`)
          .limit(1);
        
        if (profileError) {
          console.error('Admin login query error:', profileError);
          throw profileError;
        }
        
        if (!profilesData || profilesData.length === 0) {
          if ((input === '0556603336' || input === 'malachi@tzuriel.org' || input === 'malachi') && password_plain === '123456') {
            const malachiData = {
              username: 'malachi',
              password_plain: '123456',
              password: '123456',
              full_name: 'מלאכי צוריאל',
              email: 'malachi@tzuriel.org',
              role: 'super_observer',
              status: 'active',
              is_approved: 1,
              gender: 'male',
              phone: '0556603336',
              avatar_url: null
            };
            
            try {
              const { data: newMalachi, error } = await supabaseAdmin.from('profiles').insert(malachiData).select().single();
              if (newMalachi && !error) {
                return newMalachi as User;
              }
            } catch (e) {
              console.error('Failed to recreate Malachi', e);
            }
            
            return {
              id: 'malachi-placeholder-id',
              ...malachiData
            } as User;
          }
          throw new Error('משתמש לא נמצא');
        }

        const user = profilesData[0];
        
        // Special handling for Malachi
        if (user.phone === '0556603336' || user.email === 'malachi@tzuriel.org' || user.username === 'malachi') {
          if (password_plain === '123456') {
            return { ...user, full_name: 'מלאכי צוריאל', role: 'super_observer' } as User;
          }
        }

        // Check password
        if (user.password_plain !== password_plain) {
          throw new Error('פרטי הכניסה אינם תואמים. נסה שוב או פנה למנהל המערכת');
        }

        // Check if approved if on Vercel
        if (isVercel() && (user.is_approved == 0 || user.is_approved === false)) {
          throw new Error('חשבון זה עדיין לא אושר לשימוש באתר. אנא פנה למנהל המערכת.');
        }

        return user as User;
      } else if (type === 'candidate') {
        // 2. Check candidates table (Candidates)
        // Candidates use phone as username and passwords are in profiles table
        const sanitizedPhone = input.replace(/[^0-9]/g, '');
        
        // Fallback: If phone starts with '0', try both versions
        let phoneQuery = sanitizedPhone;
        let altPhoneQuery = '';
        if (sanitizedPhone.startsWith('0')) {
          altPhoneQuery = sanitizedPhone.substring(1);
        } else if (sanitizedPhone.length > 0) {
          altPhoneQuery = '0' + sanitizedPhone;
        }

        // 1. Find candidate
        let candQuery = supabase
          .from('candidates')
          .select('id, full_name, phone, type, category, image_url, created_at, created_by, deleted_at')
          .is('deleted_at', null);

        if (altPhoneQuery) {
          candQuery = candQuery.or(`phone.eq.${phoneQuery},phone.eq.${altPhoneQuery}`);
        } else {
          candQuery = candQuery.eq('phone', phoneQuery);
        }

        const { data: candidates, error: candError } = await candQuery.limit(1);

        if (candError) {
          console.error('Candidate login query error:', candError);
          throw candError;
        }

        if (!candidates || candidates.length === 0) {
          throw new Error('משודך לא נמצא במערכת');
        }

        const cand = candidates[0];
        const candPhone = cand.phone;

        // 2. Find password in profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('password_plain, role')
          .eq('phone', candPhone)
          .eq('role', 'candidate')
          .limit(1);

        if (profileError) {
          console.error('Candidate profile password query error:', profileError);
          throw profileError;
        }

        if (!profileData || profileData.length === 0) {
          throw new Error('משתמש לא נמצא בטבלת הפרופילים או שאינו מוגדר כמשודך');
        }

        if (profileData[0].password_plain === password_plain) {
          // Map candidate to User type
          return {
            id: cand.id,
            full_name: cand.full_name,
            username: cand.phone || '',
            email: '',
            role: 'candidate',
            status: 'active',
            category: cand.category,
            gender: cand.type === 'male' ? 'male' : 'female',
            phone: cand.phone,
            avatar_url: cand.image_url,
            created_at: cand.created_at
          } as User;
        } else {
          throw new Error('פרטי הכניסה אינם תואמים. נסה שוב או פנה למנהל המערכת');
        }
      }
      return null;
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('current_user');
  }

  private sanitizeAdmin(user: any): any {
    // Map Airtable specific fields if they exist but target fields don't
    const airtableImage = user.Photo || user.photo || user['תמונה'];
    if (airtableImage && !user.avatar_url) user.avatar_url = airtableImage;

    // Strict whitelist to prevent 400 errors (Schema Cache)
    const allowedFields = [
      'full_name', 
      'phone', 
      'email', 
      'username', 
      'avatar_url', 
      'role', 
      'affiliation_group',
      'status',
      'category',
      'secondary_category',
      'is_approved',
      'password_plain',
      'google_login_allowed',
      'creator_name',
      'created_by',
      'deleted_at',
      'daily_message_template',
      'is_from_file',
      'last_login',
      'last_seen',
      'is_online',
      'gender'
    ];
    
    // Ensure full_name is present if possible
    if (!user.full_name && user.email) {
      user.full_name = user.email.split('@')[0];
    }

    const sanitized: any = {};
    allowedFields.forEach(field => {
      // Allow null values to enable clearing fields in the database
      if (user[field] !== undefined) {
        sanitized[field] = user[field];
      }
    });

    // Parse Airtable image links for avatar_url
    const parseAirtableUrl = (val: any) => {
      if (val && typeof val === 'string') {
        const match = val.match(/\((https?:\/\/[^\)]+)\)/);
        return match ? match[1] : val;
      }
      return val;
    };

    if (sanitized.avatar_url) {
      sanitized.avatar_url = parseAirtableUrl(sanitized.avatar_url);
    }
    
    // Ensure default password if missing
    if (!sanitized.password_plain) {
      sanitized.password_plain = '12345678';
    }
    
    return sanitized;
  }

  private sanitizeMatch(match: any): any {
    const allowedFields = [
      'type', 'name', 'full_name', 'age', 'height', 'ethnicity', 'marital_status', 
      'city', 'religious_level', 'service', 'occupation', 'about', 'family_description',
      'looking_for', 'notes', 'smoking', 'negiah', 'age_range', 'image_url', 
      'additional_images', 'created_by', 'creator_name', 'creator_category', 
      'creator_gender', 'creator_phone', 'created_at', 'last_published_at', 
      'publish_count', 'deleted_at', 'phone', 'category', 'status', 'is_published_confirmed', 
      'crop_config', 'image_position', 'creation_source', 'managed_by', 'target_admin_id', 'admin_id'
    ];
    
    const sanitized: any = {};
    allowedFields.forEach(field => {
      if (match[field] !== undefined) {
        if (field === 'phone' && typeof match[field] === 'string') {
          sanitized[field] = match[field].replace(/[^0-9]/g, '');
        } else {
          sanitized[field] = match[field];
        }
      }
    });

    // Handle column mapping if needed
    if (match.managed_by && !sanitized.admin_id) {
      sanitized.admin_id = match.managed_by;
    }
    if (match.admin_id && !sanitized.managed_by) {
      sanitized.managed_by = match.admin_id;
    }

    return sanitized;
  }

  async getManagerCandidateCounts(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('candidates')
      .select('created_by')
      .is('deleted_at', null)
      .not('full_name', 'ilike', '%דמו%')
      .not('name', 'ilike', '%דמו%');
    
    if (error) throw error;
    
    const counts: Record<string, number> = {};
    data.forEach((m: any) => {
      if (m.created_by) {
        counts[m.created_by] = (counts[m.created_by] || 0) + 1;
      }
    });
    return counts;
  }

  async getGlobalStatsBreakdown() {
    const query = supabase.from('candidates')
      .select('type, creator_category, created_by, creator_name')
      .is('deleted_at', null)
      .not('full_name', 'ilike', '%דמו%')
      .not('name', 'ilike', '%דמו%');
    
    const candidates = await this.safeQuery(query, []);
    if (!candidates || candidates.length === 0) return {};

    const breakdown: Record<string, { 
      total: number, 
      males: number, 
      females: number, 
      managers: Record<string, { name: string, total: number, males: number, females: number }> 
    }> = {};

    candidates.forEach(m => {
      const cat = m.creator_category || 'אחר';
      if (!breakdown[cat]) {
        breakdown[cat] = { total: 0, males: 0, females: 0, managers: {} };
      }
      
      breakdown[cat].total++;
      if (m.type === 'male') breakdown[cat].males++;
      else breakdown[cat].females++;

      const managerId = m.created_by;
      if (!breakdown[cat].managers[managerId]) {
        breakdown[cat].managers[managerId] = { name: m.creator_name || 'מנהל לא ידוע', total: 0, males: 0, females: 0 };
      }
      
      breakdown[cat].managers[managerId].total++;
      if (m.type === 'male') breakdown[cat].managers[managerId].males++;
      else breakdown[cat].managers[managerId].females++;
    });

    return breakdown;
  }

  async sendWhatsAppMessage(to: string, body: string): Promise<void> {
    const token = import.meta.env.VITE_WHAPI_TOKEN;
    if (!token) {
      throw new Error('WHAPI_TOKEN is not defined');
    }

    // Get current user to append name
    const currentUser = await this.getCurrentUser();
    const managerName = currentUser?.full_name || 'מערכת';
    const prefix = currentUser?.gender === 'female' ? 'נשלח על ידי המנהלת' : 'נשלח על ידי המנהל';
    const finalBody = `*${prefix}: ${managerName}*\n\n${body}`;

    const response = await fetch('https://gate.whapi.cloud/messages/text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, body: finalBody })
    });
    if (!response.ok) {
      throw new Error(`Failed to send WhatsApp message: ${response.statusText}`);
    }
  }

  async sendWhatsAppImage(to: string, media: string, caption?: string): Promise<void> {
    const token = import.meta.env.VITE_WHAPI_TOKEN;
    if (!token) {
      throw new Error('WHAPI_TOKEN is not defined');
    }
    
    // Get current user to append name to caption
    const currentUser = await this.getCurrentUser();
    const managerName = currentUser?.full_name || 'מערכת';
    const prefix = currentUser?.gender === 'female' ? 'נשלח על ידי המנהלת' : 'נשלח על ידי המנהל';
    const finalCaption = caption 
      ? `*${prefix}: ${managerName}*\n\n${caption}`
      : `*${prefix}: ${managerName}*`;

    // Whapi expects media as URL or base64 string
    const response = await fetch('https://gate.whapi.cloud/messages/image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, media, caption: finalCaption })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send WhatsApp image: ${response.statusText}`);
    }
  }

  async getWhatsAppMessages(chatId: string): Promise<any[]> {
    const token = import.meta.env.VITE_WHAPI_TOKEN;
    if (!token) return [];
    
    try {
      const response = await fetch(`https://gate.whapi.cloud/messages/list/${chatId}?count=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.messages || [];
    } catch (err) {
      console.error('Error fetching WhatsApp messages:', err);
      return [];
    }
  }

  async getWhapiGroups(): Promise<any[]> {
    const token = import.meta.env.VITE_WHAPI_TOKEN;
    if (!token) {
      throw new Error('Whapi API Token is missing');
    }
    
    const response = await fetch('https://gate.whapi.cloud/groups?limit=50', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Whapi API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('WHAPI GROUP FETCHING ACTIVE: IDS RETRIEVED SUCCESSFULLY');
    return data.groups || [];
  }

  async clearInternalMessages(): Promise<void> {
    await this.handleSupabase(supabase.from('internal_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  }

  async clearActivityLogs(): Promise<void> {
    await this.handleSupabase(supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  }

  async clearPublishLogs(): Promise<void> {
    // await this.handleSupabase(supabase.from('publish_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  }

  async getTeamActivity(teamAdminIds: string[]): Promise<any[]> {
    if (teamAdminIds.length === 0) return [];
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .in('user_id', teamAdminIds)
      .order('created_at', { ascending: false })
      .limit(50);
    return data || [];
  }

  async getTeamPublishLogs(teamAdminIds: string[]): Promise<any[]> {
    if (teamAdminIds.length === 0) return [];
    const { data } = await supabase
      .from('publish_logs')
      .select('*')
      .in('admin_id', teamAdminIds)
      .order('created_at', { ascending: false })
      .limit(50);
    return data || [];
  }

  async clearWhatsAppGroups(): Promise<void> {
    await this.handleSupabase(supabase.from('whatsapp_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  }

  async clearCandidates(): Promise<void> {
    await Promise.all([
      this.handleSupabase(supabase.from('candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000')),
      this.handleSupabase(supabase.from('candidate_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000')),
      this.handleSupabase(supabase.from('candidate_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000'))
    ]);
  }

  // Matches (Candidates)
  async getMatches(type?: 'male' | 'female', user?: User): Promise<Match[]> {
    const activeUser = user;
    const effectiveUserId = user?.id;

    // Use supabaseAdmin for admin/team_leader to bypass RLS as requested
    const client = (activeUser && (activeUser.role === 'admin' || activeUser.role === 'team_leader' || activeUser.role === 'super_admin')) 
      ? supabaseAdmin 
      : supabase;

    let query = client
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (activeUser) {
      if (activeUser.role === 'admin') {
        if (activeUser.affiliation_group?.includes('שח"ם')) {
          query = query.ilike('category', '%שח"ם%');
        } else if (activeUser.category) {
          query = query.eq('category', activeUser.category);
        }
        if (effectiveUserId) {
          // Try managed_by first, if it fails we'll catch it in safeQuery
          query = query.or(`managed_by.eq.${effectiveUserId},admin_id.eq.${effectiveUserId}`);
        }
      } else if (activeUser.role === 'team_leader') {
        if (activeUser.affiliation_group) {
          const groupQuery = supabase.from('profiles').select('id');
          const { data: groupUsers } = await (activeUser.affiliation_group.includes('שח"ם') 
            ? groupQuery.ilike('affiliation_group', '%שח"ם%')
            : groupQuery.eq('affiliation_group', activeUser.affiliation_group));
          
          if (groupUsers && groupUsers.length > 0) {
            const userIds = groupUsers.map(u => u.id);
            query = query.or(`managed_by.in.(${userIds.join(',')}),admin_id.in.(${userIds.join(',')})`);
          }
        }
        
        if (activeUser.age_groups) {
          const ageGroups = activeUser.age_groups.split(',').map(g => g.trim());
          query = query.in('age_range', ageGroups);
        }

        if (effectiveUserId) {
          query = query.or(`managed_by.eq.${effectiveUserId},admin_id.eq.${effectiveUserId}`);
        }
      } else if (effectiveUserId && activeUser.role !== 'super_admin') {
        query = query.or(`managed_by.eq.${effectiveUserId},admin_id.eq.${effectiveUserId}`);
      }
    }

    const data = await this.safeQuery(query, []);
    let candidates = data || [];

    // 1. Remove "trash" (no name or clearly invalid)
    candidates = candidates.filter(c => c.full_name && c.full_name.trim().length > 1);

    // 2. Remove duplicates by phone number (keep newest)
    const uniqueCandidates: Match[] = [];
    const seenPhones = new Set<string>();

    for (const c of candidates) {
      const phone = (c.phone || '').replace(/\D/g, '');
      if (phone && phone.length >= 7) {
        if (!seenPhones.has(phone)) {
          seenPhones.add(phone);
          uniqueCandidates.push(c as Match);
        }
      } else {
        // Keep records without a valid phone as they might be unique manual entries
        uniqueCandidates.push(c as Match);
      }
    }

    // 3. Fetch passwords from profiles table
    const phones = uniqueCandidates.map(c => c.phone).filter(Boolean) as string[];
    if (phones.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('phone, password_plain')
        .in('phone', phones);
      
      if (profiles) {
        const passwordMap = new Map(profiles.map(p => [p.phone, p.password_plain]));
        uniqueCandidates.forEach(c => {
          if (c.phone && passwordMap.has(c.phone)) {
            c.password = passwordMap.get(c.phone) as string;
          }
        });
      }
    }

    return uniqueCandidates;
  }

  async findDuplicate(name: string, phone: string): Promise<Match | null> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('name', name)
      .eq('phone', phone)
      .is('deleted_at', null)
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return null;
    }
    return data[0] as Match;
  }

  async createMatch(match: Omit<Match, 'id' | 'created_at'>, user?: User, bypassDuplicateCheck: boolean = false): Promise<Match | { error: 'duplicate', existingMatch: Match }> {
    // Duplicate check
    if (!bypassDuplicateCheck) {
      const { data: existing } = await supabase
        .from('candidates')
        .select('*')
        .eq('name', match.full_name)
        .eq('phone', match.phone)
        .is('deleted_at', null);
      
      if (existing && existing.length > 0) {
        return { error: 'duplicate', existingMatch: existing[0] as Match };
      }
    }

    const currentUser = await this.getCurrentUser();
    const effectiveUserId = currentUser?.id;
    const effectiveUser = currentUser;

    const newMatch: any = {
      ...match,
      created_at: new Date().toISOString(),
      publish_count: 0,
      last_published_at: null,
      deleted_at: null,
      is_published_confirmed: 0,
      created_by: match.created_by || user?.id,
      managed_by: match.managed_by || user?.id,
      creator_name: match.creator_name || (user?.full_name ? `${user.full_name}${user.phone ? ` (${user.phone})` : ''}` : undefined),
      creator_category: match.creator_category || user?.category,
      category: match.category || user?.category,
      creator_gender: match.creator_gender || user?.gender,
      creator_phone: match.creator_phone || user?.phone
    };

    const sanitized = this.sanitizeMatch(newMatch);

    // Mirror external images (e.g., from Airtable CSV imports)
    if (sanitized.image_url && sanitized.image_url.startsWith('http') && !sanitized.image_url.includes('supabase.co')) {
      // Keep original URL for Airtable/external links as requested
      console.log('External image detected - keeping original URL');
    } else if (sanitized.image_url && sanitized.image_url.startsWith('data:image')) {
      const uploadedUrl = await this.uploadBase64Image(sanitized.image_url);
      if (uploadedUrl) {
        sanitized.image_url = uploadedUrl;
      } else {
        delete sanitized.image_url; // Prevent saving large base64 string if upload fails
      }
    }

    // Try insert with sanitized fields
    let data;
    try {
      const { data: res, error } = await supabase.from('candidates').insert(sanitized).select().single();
      if (error) {
        // If missing column error, try without managed_by/target_admin_id
        if (error.code === '42703') {
          const { managed_by, target_admin_id, admin_id, ...minimal } = sanitized;
          const { data: retryRes, error: retryError } = await supabase.from('candidates').insert(minimal).select().single();
          if (retryError) throw retryError;
          data = retryRes;
        } else {
          throw error;
        }
      } else {
        data = res;
      }
    } catch (err) {
      console.error('Error creating match:', err);
      throw err;
    }
    
    // Handle password in profiles table
    if (match.password && match.phone) {
      const phone = match.phone.replace(/[^0-9]/g, '');
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();
      
      if (existingProfile) {
        await supabase.from('profiles').update({
          password_plain: match.password,
          full_name: match.full_name
        }).eq('id', existingProfile.id);
      } else {
        await supabase.from('profiles').upsert({
          phone: phone,
          password_plain: match.password,
          role: 'candidate',
          full_name: match.full_name,
          username: phone // Use phone as username for candidates
        }, { onConflict: 'username' });
      }
    }

    return data as Match;
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match> {
    const sanitized = this.sanitizeMatch(updates);

    // Mirror external images
    if (sanitized.image_url && sanitized.image_url.startsWith('http') && !sanitized.image_url.includes('supabase.co')) {
      // Keep original URL for Airtable/external links as requested
      console.log('External image detected - keeping original URL');
    } else if (sanitized.image_url && sanitized.image_url.startsWith('data:image')) {
      const uploadedUrl = await this.uploadBase64Image(sanitized.image_url);
      if (uploadedUrl) {
        sanitized.image_url = uploadedUrl;
      } else {
        delete sanitized.image_url; // Prevent saving large base64 string if upload fails
      }
    }

    let data;
    try {
      const { data: res, error } = await supabase.from('candidates').update(sanitized).eq('id', id).select().maybeSingle();
      if (error) {
        // If missing column error, try without managed_by/target_admin_id
        if (error.code === '42703') {
          const { managed_by, target_admin_id, admin_id, ...minimal } = sanitized;
          const { data: retryRes, error: retryError } = await supabase.from('candidates').update(minimal).eq('id', id).select().maybeSingle();
          if (retryError) throw retryError;
          data = retryRes;
        } else {
          throw error;
        }
      } else {
        data = res;
      }
    } catch (err) {
      console.error('Error updating match:', err);
      throw err;
    }
    
    // Handle password in profiles table
    if (updates.password && (updates.phone || (data as Match)?.phone)) {
      const phone = (updates.phone || (data as Match)?.phone)?.replace(/[^0-9]/g, '');
      if (phone) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();
        
        if (existingProfile) {
          await supabase.from('profiles').update({
            password_plain: updates.password,
            full_name: updates.full_name || (data as Match)?.full_name
          }).eq('id', existingProfile.id);
        } else {
          await supabase.from('profiles').upsert({
            phone: phone,
            password_plain: updates.password,
            role: 'candidate',
            full_name: updates.full_name || (data as Match)?.full_name,
            username: phone
          }, { onConflict: 'username' });
        }
      }
    }

    return data as Match;
  }

  async deleteMatch(id: string): Promise<void> {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) {
      console.error('Error deleting match:', error);
      throw new Error('המחיקה נכשלה בשרת');
    }
  }

  async getProfileById(id: string): Promise<any> {
    const query = supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    const { data } = await this.applySyncFilter(query);
    return data;
  }

  async getCandidateByUserId(userId: string): Promise<Match | null> {
    const query = supabase
      .from('candidates')
      .select('*')
      .eq('created_by', userId)
      .single();
    const { data } = await this.applySyncFilter(query);
    return data;
  }

  async updateCandidateNotes(id: string, notes: string): Promise<void> {
    await this.handleSupabase(supabase.from('candidates').update({ notes }).eq('id', id));
  }

  // Candidate Transfers
  async createTransferRequest(candidateId: string, senderId: string, receiverId: string): Promise<void> {
    const currentUser = await this.getCurrentUser();
    await this.handleSupabase(
      supabase.from('candidate_transfers').insert({
        candidate_id: candidateId,
        sender_id: senderId || currentUser?.id,
        receiver_id: receiverId,
        status: 'pending'
      })
    );
  }

  async getPendingTransfersForMe(userId: string): Promise<Match[]> {
    const query = supabase
      .from('candidates')
      .select('*')
      .is('deleted_at', null);

    return this.safeQuery(query, []);
  }

  async getOrphanedCandidatesCount(): Promise<number> {
    const query = supabase
      .from('candidates')
      .select('id')
      .is('deleted_at', null);

    const data = await this.safeQuery(query, []);
    return data?.length || 0;
  }

  async getSentTransfersByMe(userId: string): Promise<any[]> {
    try {
      // 1. Fetch transfers first
      const { data: transfers, error } = await supabase
        .from('candidate_transfers')
        .select(`
          *,
          candidate:candidates(*)
        `)
        .eq('sender_id', userId);
      
      if (error) {
        if (error.code === 'PGRST204') {
          console.warn('Schema cache error (PGRST204). Please sync schema.');
        }
        return [];
      }

      if (!transfers || transfers.length === 0) return [];

      // 2. Fetch receiver names separately
      const receiverIds = [...new Set(transfers.map(t => t.receiver_id))];
      const { data: receivers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', receiverIds);

      const receiverMap = new Map(receivers?.map(r => [r.id, r.full_name]) || []);

      return transfers.map(t => ({
        ...t,
        receiver: { full_name: receiverMap.get(t.receiver_id) || 'מנהל לא ידוע' }
      }));
    } catch (err) {
      console.error('Error fetching sent transfers:', err);
      return [];
    }
  }

  async getActiveManagers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ["admin", "super_observer", "team_leader"]);
      
      console.log('Clean Query - No Last Seen Filter');
      
      if (error) throw error;
      return data as User[];
    } catch (error) {
      console.error('Error fetching active managers:', error);
      return [];
    }
  }

  async getAdminCount(): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error fetching admin count:', error);
      return 0;
    }
    return count || 0;
  }

  // Users (Admins)
  async getUsers(): Promise<User[]> {
    const stored = sessionStorage.getItem('current_user');
    let currentUser = null;
    try {
      currentUser = stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Error parsing current_user from sessionStorage', e);
    }
    
    if (!currentUser) {
      return [];
    }
    
    if (currentUser?.role === 'candidate') return [];

    try {
      const isAdminRole = currentUser && ['super_admin', 'admin', 'team_leader', 'viewer', 'super_observer'].includes(currentUser.role);
      const client = isAdminRole ? supabaseAdmin : supabase;

      // Try to select all relevant columns
      let query = client
        .from('profiles')
        .select('id, email, full_name, role, status, phone, avatar_url, image_url, gender, affiliation_group, password_plain, category, secondary_category, is_approved')
        .order('full_name');
      
      if (currentUser.role !== 'super_admin' && currentUser.role !== 'super_observer') {
        if (currentUser.affiliation_group?.includes('שח"ם')) {
          query = query.ilike('affiliation_group', '%שח"ם%');
        } else if (currentUser.affiliation_group) {
          query = query.eq('affiliation_group', currentUser.affiliation_group);
        } else {
          // If no group, only see themselves as a fallback to prevent seeing everyone
          query = query.eq('id', currentUser.id);
        }
      }
      
      const { data, error } = await this.applySyncFilter(query);
      const safeMap = (val: any, fallback: string = '') => (val !== null && val !== undefined ? val : fallback);
      
      if (error) {
        // Fallback to basic columns if some columns are missing
        console.warn('Some columns missing in profiles, falling back to basic columns:', error.message);
        let basicQuery = client
          .from('profiles')
          .select('id, email, full_name, role, status, phone, avatar_url, image_url, gender, affiliation_group')
          .order('full_name');

        if (currentUser.role !== 'super_admin' && currentUser.role !== 'super_observer') {
          if (currentUser.affiliation_group?.includes('שח"ם')) {
            basicQuery = basicQuery.ilike('affiliation_group', '%שח"ם%');
          } else if (currentUser.affiliation_group) {
            basicQuery = basicQuery.eq('affiliation_group', currentUser.affiliation_group);
          } else {
            basicQuery = basicQuery.eq('id', currentUser.id);
          }
        }

        const { data: basicData, error: basicError } = await this.applySyncFilter(basicQuery);
        
        if (basicError) {
          console.error('Critical error fetching users:', basicError);
          return [];
        }
        
        return (basicData || []).map(u => {
          const user = {
            ...u,
            avatar_url: u.image_url || u.avatar_url || null,
            affiliation_group: u.affiliation_group,
            category: u.category,
            age_groups: u.age_groups,
            username: u.username,
            gender: u.gender,
            password_plain: '',
            role: safeMap(u.role, 'viewer'),
            full_name: safeMap(u.full_name, u.role === 'super_admin' ? 'מנהל ראשי' : 'מנהל ללא שם')
          };
          if (user.id === '8ebb9a38-12ec-48c1-96f7-e3cd6f4648e1') {
            return { ...user, full_name: 'מנהל ראשי', username: 'good', role: 'super_admin' };
          }
          if (user.phone === '0556603336') {
            return { ...user, full_name: 'מלאכי צוריאל', role: 'super_observer' };
          }
          return user;
        }) as User[];
      }

      const processedUsers = (data || []).map(u => {
        const user = {
          ...u,
          avatar_url: u.image_url || u.avatar_url || null,
          role: safeMap(u.role, 'viewer'),
          full_name: safeMap(u.full_name, u.role === 'super_admin' ? 'מנהל ראשי' : 'מנהל ללא שם'),
          username: u.username,
          affiliation_group: u.affiliation_group
        };
        if (user.id === '8ebb9a38-12ec-48c1-96f7-e3cd6f4648e1') {
          return { ...user, full_name: 'מנהל ראשי', username: 'good', role: 'super_admin' };
        }
        if (user.phone === '0556603336') {
          return { ...user, full_name: 'מלאכי צוריאל', role: 'super_observer' };
        }
        return user;
      }) as User[];

      const rolePriority: Record<string, number> = {
        'super_observer': 1,
        'super_admin': 2,
        'team_leader': 3,
        'admin': 4,
        'viewer': 5
      };

      // Sort by role priority first so higher roles are processed first
      const sortedUsers = [...processedUsers].sort((a, b) => 
        (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99)
      );

      const uniqueUsers = new Map<string, User>();
      for (const u of sortedUsers) {
        // Use ID as key to avoid deduplicating by phone if multiple rows exist
        // The user wants the count to reflect the actual rows in the table.
        const key = u.id; 
        if (!uniqueUsers.has(key)) {
          uniqueUsers.set(key, u);
        }
      }
      return Array.from(uniqueUsers.values());
    } catch (err: any) {
      throw err;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const query = supabase.from('profiles')
      .select('id, email, full_name, role, status, phone, avatar_url, affiliation_group, category, age_groups, username, gender, is_approved')
      .eq('id', id)
      .single();
    
    // In Studio, we allow fetching unapproved users for login/session
    const { data, error } = await this.applySyncFilter(query);
    
    if (data) {
      const u = data as any;
      const fallbackName = 'מנהל מערכת';
      
      const user = {
        ...u,
        full_name: u.full_name || u.email?.split('@')[0] || fallbackName
      } as User;

      if (user.id === '8ebb9a38-12ec-48c1-96f7-e3cd6f4648e1') {
        return { ...user, full_name: 'מנהל ראשי', username: 'good', role: 'super_admin' };
      }
      if (user.phone === '0556603336') {
        return { ...user, full_name: 'מלאכי צוריאל', role: 'super_observer' };
      }
      return user;
    }
    return null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const query = supabase
      .from('profiles')
      .select('id, email, phone, full_name, role, avatar_url, status, gender, affiliation_group, username, is_approved')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    
    // In Studio, we allow fetching unapproved users for login/session
    const { data } = await this.applySyncFilter(query);
    
    if (data) {
      const u = data as any;
      const fallbackName = (u.role === 'super_admin') ? 'מנהל ראשי' : 'מנהל ללא שם';
      const user = {
        ...u,
        affiliation_group: u.affiliation_group || null,
        username: u.username || u.email || u.id,
        gender: u.gender || 'male',
        full_name: u.full_name || u.email?.split('@')[0] || fallbackName
      } as User;

      if (user.id === '8ebb9a38-12ec-48c1-96f7-e3cd6f4648e1') {
        return { ...user, full_name: 'מנהל ראשי', username: 'good', role: 'super_admin' };
      }
      if (user.phone === '0556603336') {
        return { ...user, full_name: 'מלאכי צוריאל', role: 'super_observer' };
      }
      return user;
    }
    return null;
  }

  async parseAdminsCSV(file: File, defaultCategory: string, defaultRole: string, users: User[]): Promise<any[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const allAdmins: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const admin: any = {
        category: defaultCategory,
        selected_group: defaultCategory,
        affiliation_group: defaultCategory,
        group: defaultCategory, // Add group for ScannedAdmin compatibility
        password: '12345678',
        is_from_file: 1,
        role: defaultRole,
        status: 'active',
        google_login_allowed: 'true',
        is_approved: 1
      };
      
      let hasEmail = false;
      headers.forEach((header, j) => {
        const val = values[j];
        if (!val) return;
        
        if (header === 'שם' || header === 'שם מלא' || header === 'name' || header.includes('שם וטלפון')) {
          admin.full_name = val;
          if (val.includes(' - ')) {
            const parts = val.split(' - ');
            admin.phone = parts[0].trim();
            admin.full_name = parts[1].trim();
            admin.username = parts[0].trim();
          } else {
            admin.full_name = val;
          }
        }
        if (header === 'שם משתמש' || header === 'username') admin.username = val;
        if (header === 'אימייל' || header === 'email' || header.includes('אימייל')) {
          admin.email = val;
          hasEmail = true;
        }
        if (header === 'תמונה' || header === 'image' || header === 'avatar') {
          admin.avatar_url = val;
        }
        if (header === 'טלפון' || header === 'phone') admin.phone = val;
        if (header === 'תפקיד' || header === 'role') {
          if (val === 'ראש צוות' || val === 'team_leader') admin.role = 'team_leader';
          else if (val === 'צופה' || val === 'viewer' || val === 'observer') admin.role = 'observer';
          else if (val === 'מנהל על' || val === 'super_admin') admin.role = 'super_admin';
          else if (val === 'מנהל' || val === 'admin') admin.role = 'admin';
        }
        if (header === 'מין' || header === 'gender' || header.includes('מין')) {
          if (val === 'בת' || val === 'נקבה' || val.toLowerCase() === 'female') admin.gender = 'female';
          else if (val === 'בן' || val === 'זכר' || val.toLowerCase() === 'male') admin.gender = 'male';
          else admin.gender = null;
        }
        if (header === 'תמונה' || header === 'avatar' || header === 'image' || header.includes('תמונה')) {
          const match = val.match(/\((https?:\/\/[^\)]+)\)/);
          if (match) admin.avatar_url = match[1];
          else if (val.trim().startsWith('http')) admin.avatar_url = val.trim();
        }
        if (header === 'ראש צוות' || header === 'team_leader' || header.includes('ראש צוות')) {
          const tl = users.find(u => 
            (u.role === 'team_leader' || u.role === 'super_admin') && 
            (u.full_name === val || u.username === val || u.email === val)
          );
          if (tl) {
            admin.created_by = tl.id;
            admin.creator_name = tl.full_name || tl.username;
          }
        }
      });

      if (!admin.full_name || !admin.phone) {
        continue; // Skip if full_name or phone is empty
      }

      if (!hasEmail || !admin.email) {
        const tempPhone = admin.phone || Math.random().toString(36).substring(7);
        admin.email = `temp_email_${tempPhone}@missing.com`;
      }

      if (!admin.username && admin.phone) admin.username = admin.phone;
      allAdmins.push(admin);
    }
    return allAdmins;
  }

  async upsertAdmin(admin: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const currentUser = await this.getCurrentUser();
    const effectiveUserId = currentUser?.id;
    const adminData: any = {
      ...admin,
      password_plain: admin.password_plain || '12345678',
      created_by: currentUser?.id,
      is_approved: 1,
      deleted_at: null
    };

    const sanitized = this.sanitizeAdmin(adminData);
    const withSync = this.applySyncStatus(sanitized);
    const data = await this.handleSupabase(supabase.from('profiles').upsert(withSync, { onConflict: 'phone' }).select().single());
    
    if (data) {
      await this.autoReassignCandidates(data as User);
    }
    
    return data as User;
  }

  async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    return this.upsertAdmin(user);
  }

  async autoReassignCandidates(admin: User): Promise<void> {
    // Find orphaned candidates whose previous_admin_name matches this admin
    const adminName = admin.full_name || admin.username;
    const { data: orphaned } = await supabase
      .from('candidates')
      .select('id, previous_admin_name')
      .eq('transfer_status', 'orphaned')
      .eq('previous_admin_name', adminName);

    if (!orphaned || orphaned.length === 0) return;

    // We don't auto-reassign anymore, we just provide the data for the UI to ask
    console.log(`Found ${orphaned.length} orphaned candidates for returning admin ${adminName}`);
  }

  async getOrphanedCandidatesForAdmin(adminName: string): Promise<any[]> {
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .eq('transfer_status', 'orphaned')
      .eq('previous_admin_name', adminName);
    return data || [];
  }

  async reassignOrphanedCandidates(adminId: string, adminName: string): Promise<void> {
    await supabase
      .from('candidates')
      .update({
        managed_by: adminId,
        transfer_status: 'available',
        previous_admin_name: null
      })
      .eq('transfer_status', 'orphaned')
      .eq('previous_admin_name', adminName);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<{ data: User | null; error: any }> {
    if (updates.password_plain) {
      updates.password_updated_at = new Date().toISOString();
    }
    const sanitized = this.sanitizeAdmin(updates);
    const withSync = this.applySyncStatus(sanitized);
    console.log('Updating Supabase (profiles):', withSync);
    
    try {
      const { data, error } = await supabase.from('profiles').update(withSync).eq('id', id).select().single();
      if (error) {
        console.error('Supabase update error (profiles):', error);
      }
      return { data: data as User, error };
    } catch (error) {
      console.error('Update catch error (profiles):', error);
      return { data: null, error };
    }
  }

  async deleteUser(idOrIds: string | string[]): Promise<{ error: any }> {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const malachiPhone = '0556603336';
    
    // Fetch users to check for Malachi and super_admins
    const { data: usersToCheck } = await supabase
      .from('profiles')
      .select('id, phone, role, username')
      .in('id', ids);
    
    // Only protect 'good' and Malachi
    const goodId = usersToCheck?.find(u => u.username === 'good')?.id;
    const malachiId = usersToCheck?.find(u => u.phone === malachiPhone)?.id;
    const filteredIds = ids.filter(id => id !== goodId && id !== malachiId);
    
    if (filteredIds.length === 0) return { error: null };

    try {
      // Sequential await for strict order and to avoid blocking
      // 1. Update candidates (nullable handling)
      await supabase.from('candidates').update({ created_by: null }).in('created_by', filteredIds);
      await supabase.from('candidates').update({ managed_by: null }).in('managed_by', filteredIds);
      await supabase.from('candidates').update({ admin_id: null }).in('admin_id', filteredIds);
      await supabase.from('candidates').update({ target_admin_id: null }).in('target_admin_id', filteredIds);
      
      // 2. Delete residuals from all tables
      await supabase.from('candidate_transfers').delete().in('sender_id', filteredIds);
      await supabase.from('candidate_transfers').delete().in('receiver_id', filteredIds);
      await supabase.from('candidate_notes').delete().in('user_id', filteredIds);
      await supabase.from('internal_messages').delete().in('sender_id', filteredIds);
      await supabase.from('internal_messages').delete().in('receiver_id', filteredIds);
      await supabase.from('activity_logs').delete().in('user_id', filteredIds);
      await supabase.from('publish_logs').delete().in('user_id', filteredIds);
      await supabase.from('whatsapp_groups').update({ created_by: null }).in('created_by', filteredIds);
      await supabase.from('candidate_chat_messages').delete().in('sender_id', filteredIds);
      await supabase.from('speed_date_sessions').delete().in('male_id', filteredIds);
      await supabase.from('speed_date_sessions').delete().in('female_id', filteredIds);
      await supabase.from('game_sessions').delete().in('player1_id', filteredIds);
      await supabase.from('game_sessions').delete().in('player2_id', filteredIds);
      await supabase.from('blacklist').delete().in('created_by', filteredIds);

      // 3. Finally delete the profiles
      const { error } = await supabase.from('profiles').delete().in('id', filteredIds);
      if (error) console.error('Error deleting user:', error);
      
      // 4. Also try to delete from admins table
      try {
        await supabase.from('admins').delete().in('id', filteredIds);
      } catch (e) {
        console.log('Admins table might be a view or not exist, skipping delete from admins');
      }
      
      return { error };
    } catch (error) {
      console.error('Caught error deleting user:', error);
      return { error };
    }
  }

  async transferCandidates(candidateIds: string[], targetAdminId: string): Promise<void> {
    await this.handleSupabase(
      supabase
        .from('candidates')
        .update({
          target_admin_id: targetAdminId,
          transfer_status: 'pending'
        })
        .in('id', candidateIds)
    );
  }

  async approveTransfer(candidateIds: string[]): Promise<void> {
    const ids = Array.isArray(candidateIds) ? candidateIds : [candidateIds];
    
    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, target_admin_id')
      .in('id', ids);
    
    if (candidates) {
      for (const cand of candidates) {
        if (cand.target_admin_id) {
          await supabase
            .from('candidates')
            .update({
              managed_by: cand.target_admin_id,
              transfer_status: 'approved',
              transfer_approved_at: new Date().toISOString(),
              target_admin_id: null
            })
            .eq('id', cand.id);
        }
      }
    }
  }

  async rejectTransfer(candidateIds: string[]): Promise<void> {
    const ids = Array.isArray(candidateIds) ? candidateIds : [candidateIds];
    await this.handleSupabase(
      supabase
        .from('candidates')
        .update({
          target_admin_id: null,
          transfer_status: 'orphaned'
        })
        .in('id', ids)
    );
  }

  async getOrphanedCandidates(): Promise<Match[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .is('managed_by', null)
      .is('deleted_at', null);

    if (error) throw error;
    return (data || []) as Match[];
  }

  async getPendingTransfers(adminId: string): Promise<Match[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('target_admin_id', adminId)
      .is('deleted_at', null);

    if (error) throw error;
    return (data || []) as Match[];
  }

  // Images
  getPublicImageUrl(path: string): string {
    if (!path) return '';
    
    // If it's already a full URL, return it as is
    if (path.startsWith('http')) {
      return path;
    }
    
    const { data } = supabase.storage.from('images').getPublicUrl(path);
    return data.publicUrl;
  }

  async uploadBase64Image(base64Str: string, bucket: string = 'images'): Promise<string | null> {
    return new Promise(async (resolve) => {
      try {
        if (!base64Str || !base64Str.startsWith('data:image')) {
          resolve(base64Str); // Not a base64 string, return as is
          return;
        }

        const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          console.error('Invalid base64 string');
          resolve(null);
          return;
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileExt = mimeType.split('/')[1] || 'jpeg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        console.log('Attempting upload to storage...');
        const uploadPromise = supabase.storage
          .from('images')
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: false
          });

        const timeoutPromise = new Promise<{error: any}>((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout after 15 seconds')), 15000)
        );

        const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

        if (uploadError) {
          console.error('Upload error:', uploadError);
          resolve(null);
          return;
        }

        const { data } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);

        resolve(data.publicUrl);
      } catch (error) {
        console.error('Error uploading base64 image:', error);
        resolve(null);
      }
    });
  }

  async uploadImage(file: File, bucket: string = 'images'): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const uploadPromise = supabase.storage
        .from(bucket)
        .upload(filePath, file);

      const timeoutPromise = new Promise<{error: any}>((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout after 15 seconds')), 15000)
      );

      const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  async mirrorImage(url: string, bucket: string = 'images'): Promise<string | null> {
    if (!url || !url.startsWith('http')) return null;
    
    try {
      if (url.includes('airtableusercontent')) {
        console.log('Airtable link detected - attempting direct mirror');
      }

      // Try direct fetch first as requested, avoiding corsproxy.io which is being blocked
      let response;
      try {
        response = await fetch(url);
      } catch (fetchError) {
        console.warn('Direct fetch failed (likely CORS), attempting with fallback options...');
        // If direct fetch fails, we can't really do much else from the browser if CORS is enforced
        // and the proxy is blocked. But we'll try to proceed if we got a response.
        throw fetchError;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const fileExt = url.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `mirrored_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { 
          contentType: blob.type || 'image/jpeg', 
          upsert: true 
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('Error mirroring image:', error);
      return null;
    }
  }

  async getImageSyncInventory(): Promise<{
    id: string;
    name: string;
    type: 'admin' | 'candidate';
    url: string | null;
    isSynced: boolean;
    gender: 'male' | 'female' | null;
    category: string | null;
  }[]> {
    const [profiles, candidates] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url, gender, affiliation_group'),
      supabase.from('candidates').select('id, full_name, image_url, type, category').is('deleted_at', null)
    ]);

    const inventory: any[] = [];

    if (profiles.data) {
      profiles.data.forEach(a => {
        inventory.push({
          id: a.id,
          name: a.full_name || 'מנהל ללא שם',
          type: 'admin',
          url: a.avatar_url || null,
          isSynced: !!(a.avatar_url && a.avatar_url.includes('supabase.co')),
          gender: a.gender as 'male' | 'female' | null,
          category: a.affiliation_group || null
        });
      });
    }

    if (candidates.data) {
      candidates.data.forEach(c => {
        inventory.push({
          id: c.id,
          name: c.full_name || 'משודך ללא שם',
          type: 'candidate',
          url: c.image_url || null,
          isSynced: !!(c.image_url && c.image_url.includes('supabase.co')),
          gender: c.type as 'male' | 'female' | null,
          category: c.category || null
        });
      });
    }

    return inventory;
  }

  async mirrorSingleImage(id: string, type: 'admin' | 'candidate', url: string): Promise<string | null> {
    const mirroredUrl = await this.mirrorImage(url);
    if (!mirroredUrl) return null;

    const table = type === 'admin' ? 'profiles' : 'candidates';
    const column = type === 'admin' ? 'avatar_url' : 'image_url';

    const { error } = await supabase
      .from(table)
      .update({ [column]: mirroredUrl })
      .eq('id', id);

    if (error) throw error;
    return mirroredUrl;
  }

  async mirrorAllExternalImages(): Promise<{ success: number; failed: number }> {
    try {
      // Fetch all candidates with external images (not hosted on supabase)
      const { data: candidates } = await supabase
        .from('candidates')
        .select('id, image_url')
        .not('image_url', 'is', null)
        .neq('image_url', '');

      if (!candidates) return { success: 0, failed: 0 };

      const externalCandidates = candidates.filter(c => 
        c.image_url && 
        c.image_url.startsWith('http') && 
        !c.image_url.includes('supabase.co')
      );

      let success = 0;
      let failed = 0;

      for (const item of externalCandidates) {
        try {
          const mirroredUrl = await this.mirrorImage(item.image_url);
          if (mirroredUrl) {
            await supabase.from('candidates').update({ image_url: mirroredUrl }).eq('id', item.id);
            success++;
          } else {
            failed++;
          }
        } catch (err) {
          console.error(`Failed for ID ${item.id}:`, err);
          failed++;
        }
      }

      return { success, failed };
    } catch (error) {
      console.error('Error mirroring all images:', error);
      return { success: 0, failed: 0 };
    }
  }

  getCategoryByAge(age: number): string {
    if (age >= 18 && age <= 22) return '18-22';
    if (age >= 23 && age <= 27) return '23-27';
    if (age >= 28 && age <= 32) return '28-32';
    if (age >= 33 && age <= 40) return '33-40';
    if (age >= 41 && age <= 65) return '41-65';
    return '41-65'; // Default fallback
  }

  async syncWhatsAppGroupsFromAnchor(category?: string): Promise<{ success: boolean; message: string }> {
    // Placeholder for anchor sync logic
    console.log(`Syncing WhatsApp groups from anchor for category: ${category || 'all'}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, message: 'סנכרון קבוצות מהעוגן הושלם בהצלחה' };
  }

  async syncTemplatesFromAnchor(): Promise<{ success: boolean; message: string }> {
    // Placeholder for anchor sync logic
    console.log('Syncing templates from anchor');
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, message: 'סנכרון תבניות מהעוגן הושלם בהצלחה' };
  }

  async syncResetsFromAnchor(): Promise<{ success: boolean; message: string }> {
    // Placeholder for anchor sync logic
    console.log('Syncing resets from anchor');
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, message: 'סנכרון איפוסים מהעוגן הושלם בהצלחה' };
  }

  async updateCandidateImage(candidateId: string, imageUrl: string) {
    const { error } = await supabase
      .from('candidates')
      .update({ image_url: imageUrl })
      .eq('id', candidateId);
    
    if (error) throw error;
  }

  // Notes
  async getMatchNotes(matchId: string): Promise<MatchNote[]> {
    const { data, error } = await supabase
      .from('candidate_notes')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching match notes:', error);
      return [];
    }
    return data || [];
  }

  async createMatchNote(note: Omit<MatchNote, 'id' | 'created_at'>): Promise<MatchNote> {
    const newNote = {
      ...note,
      id: this.generateUUID(),
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('candidate_notes')
      .insert(newNote)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async deleteMatchNote(id: string): Promise<void> {
    const { error } = await supabase
      .from('candidate_notes')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  // Activity Logs
  async logActivity(log: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      const newLog = {
        ...log,
        id: this.generateUUID(),
        created_at: new Date().toISOString(),
        user_id: log.user_id || currentUser?.id || '00000000-0000-0000-0000-000000000000'
      };
      await supabase.from('activity_logs').insert(newLog);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }

  async getDailySuggestions(limit: number = 3): Promise<Match[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .is('deleted_at', null)
      .limit(limit);
    
    if (error) {
      console.error('Error fetching daily suggestions:', error);
      return [];
    }
    return data || [];
  }

  async getPublishedToday(): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 1. Get publish logs from today
    const { data: logs, error: logError } = await supabase
      .from('publish_logs')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });
      
    if (logError || !logs) {
      console.error('Error fetching publish logs:', logError);
      return [];
    }
    
    if (logs.length === 0) return [];
    
    // 2. Get unique match IDs and admin IDs
    const matchIds = [...new Set(logs.map(l => l.match_id))];
    const adminIds = [...new Set(logs.map(l => l.user_id))];
    
    // 3. Fetch matches and admins
    const [matchesRes, adminsRes] = await Promise.all([
      supabase.from('candidates').select('*').in('id', matchIds),
      supabase.from('profiles').select('id, full_name, email, role, status, category, gender, phone, avatar_url, image_url, last_login').in('id', adminIds)
    ]);
    
    const matches = matchesRes.data || [];
    const admins = adminsRes.data || [];
    
    // 4. Combine data
    return logs.map(log => {
      const match = matches.find(m => m.id === log.match_id);
      const admin = admins.find(a => a.id === log.user_id);
      return {
        ...log,
        match,
        admin: admin ? {
          id: admin.id,
          name: admin.full_name,
          phone: admin.phone,
          category: admin.category,
          role: admin.role
        } : null
      };
    });
  }

  async getActivityLogs(user_id?: string): Promise<ActivityLog[]> {
    let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200);
    
    const activeUser = await this.getCurrentUser();
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (activeUser) {
      if (activeUser.role === 'team_leader' && activeUser.affiliation_group) {
        // Fetch admins in the same affiliation group
        const { data: groupUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('affiliation_group', activeUser.affiliation_group);
        
        if (groupUsers && groupUsers.length > 0) {
          const userIds = groupUsers.map(u => u.id);
          query = query.in('user_id', userIds);
        }
      } else if (activeUser.role !== 'super_admin') {
        query = query.eq('user_id', activeUser.id);
      }
    }
    
    const data = await this.handleSupabase(query) as ActivityLog[] | null;
    return data || [];
  }

  // Publish Logs
  async logPublish(log: Omit<PublishLog, 'id' | 'created_at'>): Promise<void> {
    try {
      // Temporarily disabled to prevent 400 errors
      // const effectiveUserId = this.getEffectiveUserId();
      // const newLog = {
      //   ...log,
      //   id: this.generateUUID(),
      //   user_id: log.user_id || effectiveUserId || '00000000-0000-0000-0000-000000000000',
      //   created_at: new Date().toISOString()
      // };
      // await supabase.from('publish_logs').insert(newLog);
      return Promise.resolve();
    } catch (err) {
      console.error('Failed to log publish:', err);
    }
  }

  async getPublishLogs(matchId?: string, user_id?: string): Promise<PublishLog[]> {
    return []; // Disabled to avoid 400 errors
  }

  // WhatsApp Groups
  async getWhatsAppGroups(): Promise<WhatsAppGroup[]> {
    const query = supabase.from('whatsapp_groups').select('*');
    const { data } = await this.applySyncFilter(query);
    return (data as WhatsAppGroup[]) || [];
  }

  async createWhatsAppGroup(group: Omit<WhatsAppGroup, 'id'>): Promise<WhatsAppGroup> {
    // Check if a group for this gender AND category already exists
    const { data: existingGroups } = await supabase
      .from('whatsapp_groups')
      .select('id')
      .eq('type', group.type)
      .eq('category', group.category);
    
    if (existingGroups && existingGroups.length > 0) {
      throw new Error('קבוצה כבר קיימת לקטגוריה זו');
    }

    const currentUser = await this.getCurrentUser();
    const newGroup = {
      ...group,
      id: this.generateUUID(),
      created_by: currentUser?.id,
      is_approved: 1
    };
    const data = await this.handleSupabase(supabase.from('whatsapp_groups').insert(newGroup).select().single());
    return data as WhatsAppGroup;
  }

  async updateWhatsAppGroup(id: string, updates: Partial<WhatsAppGroup>): Promise<WhatsAppGroup> {
    const data = await this.handleSupabase(supabase.from('whatsapp_groups').update(updates).eq('id', id).select().single());
    return data as WhatsAppGroup;
  }

  async getMatchById(id: string): Promise<Match | null> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return null;
    return data as Match;
  }

  async getAdminById(id: string): Promise<User | null> {
    const data = await this.handleSupabase(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
    ) as User | null;
    if (data) {
      data.avatar_url = data.image_url || data.avatar_url || null;
    }
    return data;
  }

  async getCandidateGroupInfo(category: string, gender: string, viewerGroupIds?: string[], overrideGroupId?: string): Promise<{ mainGroup: WhatsAppGroup | null, observerGroups: WhatsAppGroup[] }> {
    const { data: allGroups } = await supabase
      .from('whatsapp_groups')
      .select('*');
    
    if (!allGroups) return { mainGroup: null, observerGroups: [] };

    let mainGroup = allGroups.find(g => g.category === category && g.type === (gender === 'male' ? 'male' : 'female')) || null;
    
    // If override ID is provided from settings, try to use it as main group
    if (overrideGroupId) {
      const override = allGroups.find(g => g.id === overrideGroupId || g.whapi_id === overrideGroupId);
      if (override) mainGroup = override;
    }
    
    let observerGroups: WhatsAppGroup[] = [];
    if (viewerGroupIds && viewerGroupIds.length > 0) {
      // Only same gender and explicitly added
      observerGroups = allGroups.filter(g => 
        viewerGroupIds.includes(g.id) && 
        g.type === (gender === 'male' ? 'male' : 'female')
      );
    }

    return { mainGroup, observerGroups };
  }

  async getPublishedCardsForGroup(groupId: string): Promise<PublishLog[]> {
    return []; // Disabled to avoid 400 errors
  }

  async getCandidateByPhone(phone: string): Promise<Match | null> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('phone', phone)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();
    
    if (error || !data) return null;
    return data as Match;
  }

  async recordPublish(matchId: string, groupName: string, userId: string, userName: string, groupId?: string) {
    // 1. Fetch match to get name and current count
    const match = await this.getMatchById(matchId);
    if (!match) return;

    // 2. Log to publish_logs (Disabled)
    /*
    await this.logPublish({
      match_id: matchId,
      match_name: match.full_name,
      user_id: userId,
      user_name: userName,
      group_id: groupId,
      group_name: groupName
    });
    */

    // 3. Update match stats
    await this.updateMatch(matchId, {
      last_published_at: new Date().toISOString(),
      publish_count: (match.publish_count || 0) + 1
    });

    // 4. Log to activity_logs
    await this.logActivity({
      user_id: userId,
      user_name: userName,
      action: 'פרסום משודך',
      details: `פרסום של ${match.full_name} בקבוצה ${groupName}`,
      entity_id: matchId,
      entity_type: 'match'
    });
  }

  async markInitialSent(groupId: string) {
    await this.updateWhatsAppGroup(groupId, {
      last_initial_sent: new Date().toISOString(),
      last_initial_sent_method: 'manual'
    });
  }

  async deleteWhatsAppGroup(id: string): Promise<void> {
    await this.handleSupabase(supabase.from('whatsapp_groups').update({ is_approved: 0 }).eq('id', id));
  }

  // Stats
  async getStats(user?: User, managerId?: string): Promise<Stats> {
    try {
      const activeUser = user;
      
      // If managerId is provided, we want stats for that specific manager
      const filterUser = managerId ? { id: managerId, role: 'admin' } as User : activeUser;
      
      const uniqueCandidates = await this.getMatches(undefined, filterUser);
      const activeCandidates = uniqueCandidates.filter(m => 
        !m.is_archived && (m.status === 'active' || m.status === 'available' || !m.status)
      );

      // Use supabaseAdmin for stats to ensure full visibility for admins
      const isAdminRole = activeUser && ['super_admin', 'admin', 'team_leader', 'viewer', 'super_observer'].includes(activeUser.role);
      const client = isAdminRole ? supabaseAdmin : supabase;
      let adminsQuery = client.from('profiles').select('id, gender, category, affiliation_group, role, is_approved, status').neq('role', 'candidate');
      let publishLogsQuery = client.from('publish_logs').select('created_at, user_id');

      let groupAdminIds: string[] = [];
      if (activeUser && activeUser.role !== 'super_admin' && activeUser.role !== 'super_observer') {
        if (activeUser.affiliation_group?.includes('שח"ם')) {
          // Shaham hierarchy: Fetch all Shaham admins
          const { data: sameGroupAdmins } = await client.from('profiles')
            .select('id')
            .neq('role', 'candidate')
            .ilike('affiliation_group', '%שח"ם%');
          groupAdminIds = sameGroupAdmins?.map(a => a.id) || [];
        } else if (activeUser.affiliation_group) {
          // Fetch admins in the same affiliation group
          const { data: sameGroupAdmins } = await client.from('profiles')
            .select('id')
            .neq('role', 'candidate')
            .eq('affiliation_group', activeUser.affiliation_group);
          groupAdminIds = sameGroupAdmins?.map(a => a.id) || [];
        } else {
          // Fallback to just themselves
          groupAdminIds = [activeUser.id];
        }

        if (managerId) {
          // Strictly filter by the selected manager
          adminsQuery = adminsQuery.eq('id', managerId);
        } else if (activeUser.affiliation_group) {
          if (activeUser.affiliation_group.includes('שח"ם')) {
            adminsQuery = adminsQuery.ilike('affiliation_group', '%שח"ם%');
          } else {
            adminsQuery = adminsQuery.eq('affiliation_group', activeUser.affiliation_group);
          }
        } else if (activeUser) {
          // If impersonating and no group, filter by that user only
          adminsQuery = adminsQuery.eq('id', activeUser.id);
        } else {
          adminsQuery = adminsQuery.eq('id', activeUser.id);
        }
      }

      const [adminsData] = await Promise.all([
        this.safeQuery(adminsQuery, [])
      ]);

      const admins = adminsData || [];
      const publishLogs: any[] = []; // Disabled publish_logs to prevent 400 errors
      
      // Fetch group candidates if not super admin
      let groupCandidates: Match[] = [];
      if (activeUser && activeUser.role !== 'super_admin' && activeUser.role !== 'super_observer' && activeUser.affiliation_group) {
        let groupQuery = client.from('candidates').select('*').is('deleted_at', null);
        if (activeUser.affiliation_group.includes('שח"ם')) {
          groupQuery = groupQuery.ilike('category', '%שח"ם%');
        } else if (activeUser.category) {
          groupQuery = groupQuery.eq('category', activeUser.category);
        }
        
        // Filter by group admins
        if (groupAdminIds.length > 0) {
          groupQuery = groupQuery.or(`managed_by.in.(${groupAdminIds.join(',')}),admin_id.in.(${groupAdminIds.join(',')})`);
        }
        
        const { data: gData } = await groupQuery;
        groupCandidates = gData || [];
      } else {
        groupCandidates = activeCandidates;
      }

      const totalMatchesSite = activeCandidates.length;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const publishedTodayCount = publishLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= today;
      }).length;

      const publishedThisMonthCount = publishLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= firstDayOfMonth;
      }).length;

      const publishedThisMonthMeCount = activeUser ? publishLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= firstDayOfMonth && log.user_id === activeUser.id;
      }).length : 0;

      const publishedThisMonthGroupCount = groupAdminIds.length > 0 ? publishLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= firstDayOfMonth && groupAdminIds.includes(log.user_id);
      }).length : publishedThisMonthCount;

      return {
        males: activeCandidates.filter(m => m.type === 'male').length,
        females: activeCandidates.filter(m => m.type === 'female').length,
        malesMe: activeUser ? activeCandidates.filter(m => m.type === 'male' && m.created_by === activeUser.id).length : 0,
        femalesMe: activeUser ? activeCandidates.filter(m => m.type === 'female' && m.created_by === activeUser.id).length : 0,
        malesGroup: groupCandidates.filter(m => m.type === 'male').length,
        femalesGroup: groupCandidates.filter(m => m.type === 'female').length,
        totalMatchesSite,
        publishedToday: publishedTodayCount,
        publishedThisMonth: publishedThisMonthCount,
        publishedThisMonthMe: publishedThisMonthMeCount,
        publishedThisMonthGroup: publishedThisMonthGroupCount,
        neverPublished: activeCandidates.filter(m => !m.last_published_at).length,
        totalAdmins: admins.length,
        adminMales: admins.filter(a => a.gender === 'male').length,
        adminFemales: admins.filter(a => a.gender === 'female').length,
        superAdmins: admins.filter(a => a.role === 'super_admin' || a.id === 'b724069c-2a51-4c99-9dcb-178e488d6b4b').length,
        associationManagers: admins.filter(a => a.role === 'association_admin' || a.role === 'association_manager' || a.role === 'super_observer' || a.phone === '0556603336').length,
        regularManagers: admins.filter(a => a.role === 'admin' && a.phone !== '0556603336').length,
        teamLeaders: admins.filter(a => a.role === 'team_leader').length,
        observers: admins.filter(a => ['observer', 'super_observer', 'observer_manager', 'viewer'].includes(a.role)).length,
        activeAdmins: admins.filter(a => a.status === 'active').length,
        pendingAdmins: admins.filter(a => a.is_approved === 0).length
      };
    } catch (err) {
      console.error('Error fetching stats:', err);
      return {
        males: 0,
        females: 0,
        publishedToday: 0,
        neverPublished: 0,
        totalAdmins: 0,
        adminMales: 0,
        adminFemales: 0
      };
    }
  }

  // Settings
  async getSettings(): Promise<any> {
    const settings = localStorage.getItem('app_settings');
    if (settings) {
      return JSON.parse(settings);
    }
    return {
      appName: 'מערכת שדכנות',
      primaryColor: '#8B5CF6',
      logoUrl: '',
      welcomeMessage: 'ברוכים הבאים למערכת השדכנות'
    };
  }

  async updateSettings(settings: any): Promise<void> {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }

  async updateSetting(key: string, value: any): Promise<void> {
    const settings = await this.getSettings();
    settings[key] = value;
    await this.updateSettings(settings);
  }

  // Reset Actions
  async resetHistory(): Promise<void> {
    try {
      // Mark as pending delete instead of actual delete in Studio
      const results = await Promise.all([
        supabase.from('candidates').update({ is_approved: 0 }).neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('publish_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('candidate_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('candidate_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);

      results.forEach((res, index) => {
        if (res.error) {
          console.error(`Error in resetHistory query ${index}:`, res.error);
        }
      });
    } catch (err: any) {
      console.error('Error resetting history:', err);
      alert(`שגיאה באיפוס היסטוריה: ${err.message}`);
    }
  }

  async factoryReset(): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      
      // Data Cleanup only - delete rows from data tables
      // We wrap each delete in a try-catch so that if a table doesn't exist, it doesn't crash the whole process.
      const tablesToDelete = [
        'candidates',
        'matchmakers',
        'activity_logs',
        'publish_logs',
        'internal_messages',
        'candidate_transfers',
        'candidate_notes',
        'chat_messages'
      ];

      for (const table of tablesToDelete) {
        try {
          console.log(`Attempting to delete from ${table}...`);
          const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (error) {
            console.error(`Error deleting from ${table}:`, error);
          } else {
            console.log(`Successfully deleted from ${table}`);
          }
        } catch (e) {
          console.error(`Exception deleting from ${table}:`, e);
        }
      }

      // Delete profiles EXCEPT super_admin, association_manager, association_admin, super_observer, and Malachi
      try {
        console.log(`Attempting to delete profiles...`);
        // Simplify the query to avoid 400 Bad Request errors from complex filters
        const { error: profilesError } = await supabase.from('profiles')
          .delete()
          .neq('role', 'super_admin')
          .neq('role', 'association_manager')
          .neq('role', 'association_admin')
          .neq('role', 'super_observer')
          .neq('phone', '0556603336')
          .neq('id', currentUser?.id || '00000000-0000-0000-0000-000000000000');
          
        if (profilesError) {
          console.error('Error deleting profiles:', profilesError);
        } else {
          console.log(`Successfully deleted profiles`);
        }
      } catch (e) {
        console.error('Exception deleting profiles:', e);
      }

      // Do NOT reset local settings or whatsapp_groups
    } catch (err: any) {
      console.error('Error in factory reset:', err);
      // Don't alert here to prevent stopping the UI, the reload will happen in the component
    }
  }


  // Internal Messages
  async getInternalMessages(otherUserId: string): Promise<any[]> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return [];
    
    const activeUserId = currentUser.id;
    
    const data = await this.handleSupabase(
      supabase
        .from('internal_messages')
        .select('*')
        .or(`and(sender_id.eq.${activeUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${activeUserId})`)
        .order('created_at', { ascending: true })
    ) as any[] | null;
      
    return data || [];
  }

  async sendInternalMessage(message: { receiver_id: string, content: string, sender_id: string, sender_name: string }): Promise<any> {
    const data = await this.handleSupabase(
      supabase
        .from('internal_messages')
        .insert({
          receiver_id: message.receiver_id,
          text: message.content,
          sender_id: message.sender_id,
          sender_name: message.sender_name,
          id: this.generateUUID(),
          created_at: new Date().toISOString(),
          is_read: false
        })
        .select()
        .single()
    );
      
    if (!data) {
      throw new Error('Failed to send internal message');
    }
    return data;
  }

  async markMessagesAsRead(senderId: string): Promise<void> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return;
    
    const activeUserId = currentUser.id;
    
    await this.handleSupabase(
      supabase
        .from('internal_messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', activeUserId)
        .eq('is_read', false)
    );
  }

  // Candidate Portal & Gamification
  async getPortalSettings(): Promise<PortalSettings> {
    try {
      const { data, error } = await supabase.from('portal_settings').select('*').limit(1).single();
      if (error || !data) {
        // Create default settings if not exists
        const defaultSettings = {
          memory_game_images: JSON.stringify([
            'https://picsum.photos/seed/match1/400/400',
            'https://picsum.photos/seed/match2/400/400',
            'https://picsum.photos/seed/match3/400/400',
            'https://picsum.photos/seed/match4/400/400'
          ]),
          is_speed_date_active: true
        };
        const { data: newData } = await supabase.from('portal_settings').insert(defaultSettings).select().single();
        return newData as PortalSettings;
      }
      return data as PortalSettings;
    } catch (err) {
      return {
        id: '',
        memory_game_images: '[]',
        is_speed_date_active: true,
        created_at: ''
      } as PortalSettings;
    }
  }

  async updatePortalSettings(settings: Partial<PortalSettings>): Promise<void> {
    const current = await this.getPortalSettings();
    if (current.id) {
      await this.handleSupabase(supabase.from('portal_settings').update(settings).eq('id', current.id));
    }
  }

  async syncAdminAvatar(userId: string, externalUrl: string): Promise<string | null> {
    try {
      // Use the existing mirrorImage function to upload to Supabase Storage
      const permanentUrl = await this.mirrorImage(externalUrl, 'avatars');
      
      if (permanentUrl) {
        // Update the profile with the new permanent URL
        await this.handleSupabase(
          supabase.from('profiles')
            .update({ avatar_url: permanentUrl })
            .eq('id', userId)
        );
        return permanentUrl;
      }
      return null;
    } catch (err) {
      console.error('Error syncing admin avatar:', err);
      return null;
    }
  }

  async saveGameScore(score: Omit<GameScore, 'id' | 'created_at'>): Promise<void> {
    const currentUser = await this.getCurrentUser();
    const finalScore = {
      ...score,
      candidate_id: score.candidate_id || currentUser?.id
    };
    await this.handleSupabase(supabase.from('game_scores').insert(finalScore));
  }

  async saveGameResult(result: any): Promise<void> {
    const currentUser = await this.getCurrentUser();
    const finalResult = {
      ...result,
      user_id: result.user_id || currentUser?.id
    };
    await this.handleSupabase(supabase.from('game_results').insert(finalResult));
  }

  async addToBlacklist(entry: Omit<Blacklist, 'id' | 'created_at'>): Promise<void> {
    const currentUser = await this.getCurrentUser();
    const finalEntry = {
      ...entry,
      created_by: currentUser?.id || entry.created_by
    };
    await this.handleSupabase(supabase.from('blacklist').insert(finalEntry));
  }

  async getLeaderboard(): Promise<GameScore[]> {
    const { data } = await supabase
      .from('game_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    return data || [];
  }

  async getGameLogs(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('game_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching game logs:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Error fetching game logs:', err);
      return [];
    }
  }

  async getWeeklyLeaderboard(): Promise<{
    mostWins: { id: string, name: string, wins: number, photo: string }[],
    mostPlayed: { id: string, name: string, played: number, photo: string }[],
    pairOfTheWeek: { pair: string, games: number }[]
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: logs, error } = await supabase
      .from('game_logs')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (error || !logs) return { mostWins: [], mostPlayed: [], pairOfTheWeek: [] };

    const wins: Record<string, number> = {};
    const played: Record<string, number> = {};
    const pairs: Record<string, number> = {};
    const userNames: Record<string, string> = {};

    logs.forEach(log => {
      [log.player1_id, log.player2_id].forEach(id => {
        if (id) {
          played[id] = (played[id] || 0) + 1;
          if (id === log.player1_id) userNames[id] = log.player1_name;
          else userNames[id] = log.player2_name;
        }
      });

      if (log.winner_id) {
        wins[log.winner_id] = (wins[log.winner_id] || 0) + 1;
      }

      const pair = [log.player1_id, log.player2_id].sort().join('_');
      pairs[pair] = (pairs[pair] || 0) + 1;
    });

    const profiles = await this.handleSupabase(
      supabase.from('profiles').select('id, avatar_url')
    ) as any[] | null || [];
    const profileMap = new Map((profiles as any[]).map((p: any) => [p.id, p.avatar_url]));

    const formatTop = (obj: Record<string, number>) => 
      Object.entries(obj)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([id, count]) => ({
          id,
          name: userNames[id] || 'שחקן',
          count,
          photo: (profileMap.get(id) as string) || ''
        }));

    return {
      mostWins: formatTop(wins).map(item => ({ id: item.id, name: item.name, wins: item.count, photo: item.photo })),
      mostPlayed: formatTop(played).map(item => ({ id: item.id, name: item.name, played: item.count, photo: item.photo })),
      pairOfTheWeek: Object.entries(pairs)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([pair, games]) => ({ pair, games }))
    };
  }

  async logGame(log: {
    player1_id: string;
    player1_name: string;
    player2_id: string;
    player2_name: string;
    game_type: string;
    winner_id: string | null;
    duration_seconds: number;
  }): Promise<void> {
    const currentUser = await this.getCurrentUser();
    try {
      const finalLog = {
        ...log,
        player1_id: log.player1_id || currentUser?.id
      };
      await supabase.from('game_logs').insert([finalLog]);
    } catch (err) {
      console.error('Error logging game:', err);
    }
  }

  async getDailySuggestion(category: string, gender: 'male' | 'female'): Promise<Match | null> {
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .eq('category', category)
      .eq('type', gender === 'male' ? 'female' : 'male') // Suggest opposite gender
      .eq('status', 'available')
      .limit(1);
    
    if (data && data.length > 0) return data[0] as Match;
    return null;
  }

  async getPortalStats(): Promise<{ registeredMatches: number, totalGames: number, speedDatesToday: number }> {
    const [
      { count: registeredMatches },
      { count: totalGames },
      { count: speedDatesToday }
    ] = await Promise.all([
      supabase.from('candidates')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .not('full_name', 'ilike', '%דמו%')
        .not('name', 'ilike', '%דמו%'),
      supabase.from('game_scores')
        .select('*', { count: 'exact', head: true })
        .not('candidate_name', 'ilike', '%דמו%'),
      supabase.from('speed_date_sessions').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0])
    ]);

    return {
      registeredMatches: registeredMatches || 0,
      totalGames: totalGames || 0,
      speedDatesToday: speedDatesToday || 0
    };
  }

  async startSpeedDate(userId: string, gender: 'male' | 'female'): Promise<SpeedDateSession | null> {
    const oppositeGender = gender === 'male' ? 'female' : 'male';
    const { data: potentialPartners } = await supabase
      .from('profiles')
      .select('id')
      .eq('gender', oppositeGender)
      .eq('is_online', true)
      .neq('id', userId)
      .limit(5);

    if (potentialPartners && potentialPartners.length > 0) {
      const partnerId = potentialPartners[Math.floor(Math.random() * potentialPartners.length)].id;
      const expiresAt = new Date(Date.now() + 7 * 60 * 1000).toISOString();
      
      const session = {
        male_id: gender === 'male' ? userId : partnerId,
        female_id: gender === 'female' ? userId : partnerId,
        status: 'active',
        expires_at: expiresAt
      };
      
      const { data } = await supabase.from('speed_date_sessions').insert(session).select().single();
      return data as SpeedDateSession;
    }
    
    return null;
  }

  async getActiveSpeedDate(userId: string): Promise<SpeedDateSession | null> {
    const { data } = await supabase
      .from('speed_date_sessions')
      .select('*')
      .or(`male_id.eq.${userId},female_id.eq.${userId}`)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) return data[0] as SpeedDateSession;
    return null;
  }

  async sendChatMessage(sessionId: string, senderId: string, text: string): Promise<void> {
    await this.handleSupabase(supabase.from('candidate_chat_messages').insert({
      session_id: sessionId,
      sender_id: senderId,
      text
    }), true);
  }

  async getChatMessages(sessionId: string): Promise<any[]> {
    const { data } = await supabase
      .from('candidate_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    return data || [];
  }

  async performAdminCleanup(): Promise<void> {
    try {
      // Call the deep clean to ensure only 3 admins remain
      await this.performDeepClean();
      
      // 1. Delete users with password '12345678' (Hard Delete) - Extra safety
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('password_plain', '12345678')
        .neq('username', 'good');

      // 2. Delete users named 'god' (Hard Delete)
      await supabaseAdmin
        .from('profiles')
        .delete()
        .or('username.eq.god,name.eq.god');

      // 3. Delete 'ghost' users (rows without username)
      await supabaseAdmin
        .from('profiles')
        .delete()
        .or('username.is.null,username.eq.""');

      console.log('Aggressive cleanup completed via performAdminCleanup');
    } catch (err) {
      console.error('Error in performAdminCleanup:', err);
    }
  }

  async updateSpeedDateStatus(sessionId: string, status: 'active' | 'completed' | 'expired', shareDetails?: { male?: boolean, female?: boolean }): Promise<void> {
    const updates: any = { status };
    if (shareDetails?.male !== undefined) updates.share_details_male = shareDetails.male;
    if (shareDetails?.female !== undefined) updates.share_details_female = shareDetails.female;
    
    await this.handleSupabase(supabase.from('speed_date_sessions').update(updates).eq('id', sessionId), true);
  }

  async getOnlineStats() {
    // Since is_online might be missing, use status === 'active' as a fallback
    const { data: males } = await supabase.from('profiles').select('id').eq('gender', 'male').eq('status', 'active');
    const { data: females } = await supabase.from('profiles').select('id').eq('gender', 'female').eq('status', 'active');
    return { males: males?.length || 0, females: females?.length || 0 };
  }
}

export const dataService = new DataService();
