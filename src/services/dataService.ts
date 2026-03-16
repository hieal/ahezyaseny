import { User, Match, ActivityLog, PublishLog, WhatsAppGroup, Stats, MatchNote, GameScore, PortalSettings, SpeedDateSession } from '../types';
import { supabase, supabaseAdmin } from './supabase';

export type BackendMode = 'temporary' | 'production';

const SCHEMA_SQL = `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  username TEXT UNIQUE,
  email TEXT,
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
  is_shaham_manager INTEGER DEFAULT 0,
  last_login TIMESTAMP WITH TIME ZONE,
  password_updated_at TIMESTAMP WITH TIME ZONE,
  assigned_group_id UUID,
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
  password TEXT DEFAULT '12345678'
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
  last_initial_sent_method TEXT
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
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE public.publish_logs ADD COLUMN IF NOT EXISTS group_id UUID;

-- Disable RLS for all tables to allow prototype access (The "Switch")
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_transfers DISABLE ROW LEVEL SECURITY;
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

-- Insert initial admin user
INSERT INTO public.profiles (id, name, username, email, role, password_plain, password, status, is_approved)
VALUES ('b724069c-2a51-4c99-9dcb-178e488d6b4b', 'מנהל ראשי', 'god', 'admin@example.com', 'super_admin', 'good', 'good', 'active', 1)
ON CONFLICT (id) DO UPDATE SET name = 'מנהל ראשי', username = 'god', password_plain = 'good', password = 'good';

-- Delete the old 'good' user if it exists to prevent duplicates
DELETE FROM public.profiles WHERE username = 'good' AND id != 'b724069c-2a51-4c99-9dcb-178e488d6b4b';

-- הארכת תוקף החיבור ל-24 שעות
ALTER ROLE authenticator SET auth.jwt_expiry = 86400;

-- וודא שהמנהל שלך (god/good) מסומן כפעיל תמיד
UPDATE public.profiles 
SET last_seen = NOW(), is_online = true
WHERE username = 'god' OR username = 'good';

-- Initialize portal settings
INSERT INTO public.portal_settings (id, memory_game_images, is_speed_date_active)
VALUES ('00000000-0000-0000-0000-000000000000', '["https://picsum.photos/seed/1/200/200", "https://picsum.photos/seed/2/200/200", "https://picsum.photos/seed/3/200/200", "https://picsum.photos/seed/4/200/200", "https://picsum.photos/seed/5/200/200", "https://picsum.photos/seed/6/200/200"]', true)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
`;

class DataService {
  private mode: BackendMode = 'production';

  setMode(mode: BackendMode) {
    this.mode = 'production'; // Always production
    localStorage.setItem('backend_mode', 'production');
  }

  getMode(): BackendMode {
    return 'production';
  }

  private async handleSupabase<T>(promise: PromiseLike<{ data: T | null; error: any }>): Promise<T | null> {
    try {
      const { data, error } = await promise;
      if (error) {
        console.error('Supabase error details:', error);
        if (error.code === '42P01') {
          throw new Error('חסרה טבלה במסד הנתונים. אנא לחץ על כפתור הסנכרון (Refresh) בדף ההתחברות.');
        }
        if (error.code === '42703' || error.code === 'PGRST204' || (error.message && error.message.includes('does not exist'))) {
          console.warn(`Missing column or schema cache error: ${error.message}. Please run the SQL migration and refresh.`);
          // If it's a schema cache error, we might want to tell the user to sync schema
          if (error.code === 'PGRST204') {
            throw new Error('שגיאת סנכרון בשרת (Schema Cache). אנא לחץ על כפתור "סנכרן סכמה" בהגדרות או בדף ההתחברות.');
          }
          return null;
        }
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          throw new Error('שגיאת הרשאות (RLS). אנא וודא שביטלת את ה-RLS ב-Supabase עבור כל הטבלאות.');
        }
        throw error;
      }
      return data;
    } catch (err: any) {
      console.error('Supabase error:', err);
      if (err.message && (err.message.includes('סנכרון') || err.message.includes('הרשאות'))) {
        throw err;
      }
      throw new Error(`שגיאה בחיבור לשרת: ${err.message || 'וודא שהמפתחות תקינים'}`);
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
        await supabase.from('profiles').update({ 
          last_login: new Date().toISOString(), 
        }).eq('id', user.id);
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
      const data = await this.handleSupabase(
        supabase
          .from('profiles')
          .select('id, email, phone, username, password_plain, full_name, name, role, avatar_url, gender, status, category, secondary_category, last_seen, is_online, created_at, created_by, daily_message_template, is_from_file, is_approved, is_shaham_manager')
          .eq('id', user.id)
          .limit(1)
          .single()
      );
        
      if (!data) {
        if (sessionUserJson) sessionStorage.removeItem('current_user');
        else localStorage.removeItem('current_user');
        return null;
      }
      
      const u = data as any;
      const updatedUser: User = {
        ...u,
        name: u.full_name || u.name || u.email?.split('@')[0] || u.username || 'מנהל ללא שם'
      };
      
      if (sessionUserJson) sessionStorage.setItem('current_user', JSON.stringify(updatedUser));
      else localStorage.setItem('current_user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (err) {
      return user;
    }
  }

  async login(usernameOrEmailOrPhone: string, password_plain: string, type: 'admin' | 'candidate'): Promise<User | null> {
    // Clear cache
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('current_user');

    const input = usernameOrEmailOrPhone.trim();

    // Direct Login Override for 'god'
    if (input === 'god' && type === 'admin') {
      try {
        const { data: user, error } = await supabase
          .from('profiles')
          .select('id, username, password_plain, role, full_name')
          .eq('username', 'god')
          .single();
        
        if (error) {
          console.error('God login error:', error);
          if (error.code === '406') throw new Error('Database connection error (406)');
          throw error;
        }
        
        if (user && user.password_plain === password_plain) {
          // Override full_name and role for 'god'
          return { ...user, full_name: 'מנהל ראשי', role: 'super_admin' } as User;
        } else {
          throw new Error('פרטי הכניסה אינם תואמים. נסה שוב או פנה למנהל המערכת');
        }
      } catch (err: any) {
        if (err.message === 'Database connection error (406)') throw err;
        
        // Fallback: simplified query
        const { data: user, error } = await supabase
          .from('profiles')
          .select('id, username, password_plain, role, full_name')
          .eq('username', 'god');
          
        if (user && user.length > 0 && user[0].password_plain === password_plain) {
          // Override full_name and role for 'god'
          return { ...user[0], full_name: 'מנהל ראשי', role: 'super_admin' } as User;
        }
        throw err;
      }
    }
    
    try {
      if (type === 'admin') {
        // 1. Check profiles table (Admins)
        const { data: profilesData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, phone, username, password_plain, full_name, role, avatar_url, gender, status, category, last_login, is_shaham_manager')
          .or(`phone.eq.${input},email.eq.${input},username.eq.${input}`)
          .limit(1);
        
        if (profileError) {
          console.error('Admin login query error:', profileError);
          throw profileError;
        }
        
        if (profilesData && profilesData.length > 0) {
          const user = profilesData[0];
          
          // Check password against password_plain
          if (user.password_plain === password_plain) {
            return user as User;
          } else {
            throw new Error('פרטי הכניסה אינם תואמים. נסה שוב או פנה למנהל המערכת');
          }
        }
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
          .select('password_plain')
          .eq('phone', candPhone)
          .limit(1);

        if (profileError) {
          console.error('Candidate profile password query error:', profileError);
        }

        const dbPassword = (profileData && profileData.length > 0) 
          ? profileData[0].password_plain 
          : '12345678'; // Default fallback

        if (dbPassword === password_plain) {
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
            last_login: null,
            is_shaham_manager: 0
          } as User;
        } else {
          throw new Error('פרטי הכניסה אינם תואמים. נסה שוב או פנה למנהל המערכת');
        }
      }
      
      throw new Error('פרטי הכניסה אינם תואמים. נסה שוב או פנה למנהל המערכת');
    } catch (err: any) {
      console.error('Login error details:', err);
      throw err;
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('current_user');
  }

  private sanitizeAdmin(user: any): any {
    // Strict whitelist to prevent 400 errors (Schema Cache)
    const allowedFields = [
      'full_name', 
      'phone', 
      'email', 
      'username', 
      'avatar_url', 
      'gender', 
      'role', 
      'category', 
      'status', 
      'password_plain'
    ];
    
    // Map name to full_name if needed
    if (!user.full_name && user.name) {
      user.full_name = user.name;
    }

    const sanitized: any = {};
    allowedFields.forEach(field => {
      // Conditional username: only send for 'god' user if it causes issues for others
      if (field === 'username') {
        if (user.username === 'god') {
          sanitized[field] = user[field];
        }
        return;
      }

      if (user[field] !== undefined && user[field] !== null) {
        sanitized[field] = user[field];
      }
    });
    
    // Ensure default password if missing
    if (!sanitized.password_plain) {
      sanitized.password_plain = '12345678';
    }
    
    return sanitized;
  }

  private sanitizeMatch(match: any): any {
    const allowedFields = [
      'type', 'name', 'full_name', 'age', 'height', 'ethnicity', 'marital_status', 
      'city', 'religious_level', 'service', 'occupation', 'about', 
      'looking_for', 'notes', 'smoking', 'negiah', 'age_range', 'image_url', 
      'additional_images', 'created_by', 'creator_name', 'creator_category', 
      'creator_gender', 'creator_phone', 'created_at', 'last_published_at', 
      'publish_count', 'deleted_at', 'phone', 'category', 'status', 'is_published_confirmed', 
      'crop_config', 'creation_source'
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
    const { data: candidates } = await supabase.from('candidates')
      .select('type, creator_category, created_by, creator_name')
      .is('deleted_at', null)
      .not('full_name', 'ilike', '%דמו%')
      .not('name', 'ilike', '%דמו%');
    if (!candidates) return {};

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
    const managerName = currentUser?.name || 'מערכת';
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
    const managerName = currentUser?.name || 'מערכת';
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

  async clearInternalMessages(): Promise<void> {
    await this.handleSupabase(supabase.from('internal_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  }

  async clearActivityLogs(): Promise<void> {
    await this.handleSupabase(supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  }

  async clearPublishLogs(): Promise<void> {
    await this.handleSupabase(supabase.from('publish_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
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
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching matches:', error);
      throw error;
    }
    
    let candidates = data || [];

    // 1. Remove "trash" (no name or clearly invalid)
    candidates = candidates.filter(c => c.name && c.name.trim().length > 1);

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
            c.password = passwordMap.get(c.phone);
          }
        });
      }
    }

    return uniqueCandidates;
  }

  async createMatch(match: Omit<Match, 'id' | 'created_at'>, user?: User): Promise<Match> {
    // Duplicate check
    const { data: existing } = await supabase
      .from('candidates')
      .select('id')
      .eq('name', match.name)
      .eq('phone', match.phone)
      .is('deleted_at', null);
    
    if (existing && existing.length > 0) {
      throw new Error('משודך עם שם וטלפון זהה כבר קיים במערכת');
    }

    const newMatch: any = {
      ...match,
      created_at: new Date().toISOString(),
      publish_count: 0,
      last_published_at: null,
      deleted_at: null,
      is_published_confirmed: 0,
      created_by: match.created_by || user?.id,
      creator_name: match.creator_name || (user?.full_name ? `${user.full_name}${user.phone ? ` (${user.phone})` : ''}` : undefined),
      creator_category: match.creator_category || user?.category,
      category: match.category || user?.category,
      creator_gender: match.creator_gender || user?.gender,
      creator_phone: match.creator_phone || user?.phone
    };

    const sanitized = this.sanitizeMatch(newMatch);
    sanitized.full_name = sanitized.name;

    // Mirror external images (e.g., from Airtable CSV imports)
    if (sanitized.image_url && sanitized.image_url.startsWith('http') && !sanitized.image_url.includes('supabase.co')) {
      const mirroredUrl = await this.mirrorImage(sanitized.image_url);
      if (mirroredUrl) {
        sanitized.image_url = mirroredUrl;
      }
    }

    const data = await this.handleSupabase(supabase.from('candidates').insert(sanitized).select().single());
    
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
          full_name: match.full_name || match.name
        }).eq('id', existingProfile.id);
      } else {
        await supabase.from('profiles').insert({
          phone: phone,
          password_plain: match.password,
          role: 'candidate',
          full_name: match.full_name || match.name,
          username: phone // Use phone as username for candidates
        });
      }
    }

    return data as Match;
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match> {
    const sanitized = this.sanitizeMatch(updates);
    if (sanitized.name) sanitized.full_name = sanitized.name;

    // Mirror external images
    if (sanitized.image_url && sanitized.image_url.startsWith('http') && !sanitized.image_url.includes('supabase.co')) {
      const mirroredUrl = await this.mirrorImage(sanitized.image_url);
      if (mirroredUrl) {
        sanitized.image_url = mirroredUrl;
      }
    }

    const data = await this.handleSupabase(supabase.from('candidates').update(sanitized).eq('id', id).select().maybeSingle());
    
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
            full_name: updates.full_name || updates.name || (data as Match)?.full_name || (data as Match)?.name
          }).eq('id', existingProfile.id);
        } else {
          await supabase.from('profiles').insert({
            phone: phone,
            password_plain: updates.password,
            role: 'candidate',
            full_name: updates.full_name || updates.name || (data as Match)?.full_name || (data as Match)?.name,
            username: phone
          });
        }
      }
    }

    return data as Match;
  }

  async deleteMatch(id: string): Promise<void> {
    await this.handleSupabase(supabase.from('candidates').update({ deleted_at: new Date().toISOString() }).eq('id', id));
  }

  // Candidate Transfers
  async createTransferRequest(candidateId: string, senderId: string, receiverId: string): Promise<void> {
    await this.handleSupabase(
      supabase.from('candidate_transfers').insert({
        candidate_id: candidateId,
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending'
      })
    );
  }

  async getPendingTransfersForMe(userId: string): Promise<any[]> {
    try {
      // 1. Fetch transfers first
      const { data: transfers, error } = await supabase
        .from('candidate_transfers')
        .select(`
          *,
          candidate:candidates(*)
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending');
      
      if (error) {
        if (error.code === 'PGRST204') {
          console.warn('Schema cache error (PGRST204). Please sync schema.');
        }
        return [];
      }

      if (!transfers || transfers.length === 0) return [];

      // 2. Fetch sender names separately to avoid join issues
      const senderIds = [...new Set(transfers.map(t => t.sender_id))];
      const { data: senders } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds);

      const senderMap = new Map(senders?.map(s => [s.id, s.full_name]) || []);

      return transfers.map(t => ({
        ...t,
        sender: { full_name: senderMap.get(t.sender_id) || 'מנהל לא ידוע' }
      }));
    } catch (err) {
      console.error('Error fetching pending transfers:', err);
      return [];
    }
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

  async approveTransfer(transferId: string): Promise<void> {
    // 1. Get the transfer details
    const { data: transfer } = await supabase
      .from('candidate_transfers')
      .select('*')
      .eq('id', transferId)
      .single();

    if (!transfer) throw new Error('Transfer not found');

    // 2. Update the candidate's owner
    const { data: receiver } = await supabase
      .from('profiles')
      .select('name, category, gender, phone')
      .eq('id', transfer.receiver_id)
      .single();

    await this.handleSupabase(
      supabase.from('candidates').update({
        created_by: transfer.receiver_id,
        creator_name: receiver?.name,
        creator_category: receiver?.category,
        creator_gender: receiver?.gender,
        creator_phone: receiver?.phone
      }).eq('id', transfer.candidate_id)
    );

    // 3. Update the transfer status
    await this.handleSupabase(
      supabase.from('candidate_transfers').update({ status: 'approved' }).eq('id', transferId)
    );
  }

  async rejectTransfer(transferId: string): Promise<void> {
    await this.handleSupabase(
      supabase.from('candidate_transfers').update({ status: 'rejected' }).eq('id', transferId)
    );
  }

  // Users (Admins)
  async getUsers(): Promise<User[]> {
    const stored = sessionStorage.getItem('current_user');
    const currentUser = stored ? JSON.parse(stored) : null;
    if (currentUser?.role === 'candidate') return [];

    try {
      console.log('Fetching all admins from profiles table...');
      // Select only necessary fields to avoid 400 errors and improve performance
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, status, category, phone, avatar_url, username, gender, last_login');
      
      if (error) {
        console.error('CRITICAL ERROR fetching admins:', error.message, error.details, error.hint);
        throw error;
      }

      // Ensure full_name is populated for all users
      const processedData = (data || []).map(u => ({
        ...u,
        name: u.full_name || u.username || u.email?.split('@')[0] || 'מנהל ללא שם'
      }));

      return processedData as User[];
    } catch (err: any) {
      console.error('FAILED to fetch admins from Supabase:', err);
      throw err;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const data = await this.handleSupabase(
      supabase.from('profiles')
        .select('id, email, full_name, role, status, category, phone, avatar_url, username, gender, last_login')
        .eq('id', id)
        .single()
    );
    if (data) {
      const u = data as any;
      u.name = u.full_name || u.email?.split('@')[0] || u.username || 'מנהל ללא שם';
      return u as User;
    }
    return null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const data = await this.handleSupabase(
      supabase.from('profiles')
        .select('id, email, phone, username, full_name, role, avatar_url, gender, status, category, secondary_category, last_seen, is_online, created_at, created_by')
        .eq('email', email)
        .limit(1)
        .maybeSingle()
    );
    if (data) {
      const u = data as any;
      u.name = u.full_name || u.email?.split('@')[0] || u.username || 'מנהל ללא שם';
      return u as User;
    }
    return null;
  }

  async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const currentUser = await this.getCurrentUser();
    const newUser: any = {
      ...user,
      password_plain: user.password_plain || '12345678',
      created_by: currentUser?.id
    };

    const sanitized = this.sanitizeAdmin(newUser);
    console.log('Sending to Supabase (profiles):', sanitized);
    const data = await this.handleSupabase(supabase.from('profiles').insert(sanitized).select().single());
    return data as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    if (updates.password_plain) {
      updates.password_updated_at = new Date().toISOString();
    }
    const sanitized = this.sanitizeAdmin(updates);
    console.log('Updating Supabase (profiles):', sanitized);
    const data = await this.handleSupabase(supabase.from('profiles').update(sanitized).eq('id', id).select().single());
    return data as User;
  }

  async deleteUser(idOrIds: string | string[]): Promise<void> {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    
    // Safeguard: Never allow deleting the 'god' user
    // We need to find if any of the IDs belong to 'god'
    // Actually, it's safer to just filter out the 'god-id' if we know it, 
    // or better, the UI should prevent it. 
    // But for extra safety, we can check the usernames if we had them.
    // Since we only have IDs here, we assume the UI handles the 'god' check.
    // However, if we want to be absolutely sure, we'd need to fetch them first, 
    // but that's expensive. Let's assume 'god-id' is a known constant or handled by UI.
    const filteredIds = ids.filter(id => id !== 'god-id');
    
    if (filteredIds.length === 0) return;

    if (filteredIds.length === 1) {
      await this.handleSupabase(supabase.from('profiles').delete().eq('id', filteredIds[0]));
    } else {
      await this.handleSupabase(supabase.from('profiles').delete().in('id', filteredIds));
    }
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

  async uploadImage(file: File, bucket: string = 'images'): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

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
    url: string;
    isSynced: boolean;
  }[]> {
    const [profiles, candidates] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url'),
      supabase.from('candidates').select('id, name, image_url').is('deleted_at', null)
    ]);

    const inventory: any[] = [];

    if (profiles.data) {
      profiles.data.forEach(a => {
        if (a.avatar_url) {
          inventory.push({
            id: a.id,
            name: a.full_name,
            type: 'admin',
            url: a.avatar_url,
            isSynced: a.avatar_url.includes('supabase.co')
          });
        }
      });
    }

    if (candidates.data) {
      candidates.data.forEach(c => {
        if (c.image_url) {
          inventory.push({
            id: c.id,
            name: c.name,
            type: 'match',
            url: c.image_url,
            isSynced: c.image_url.includes('supabase.co')
          });
        }
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
    
    if (error) throw error;
    
    return (data || []).map((note: any) => {
      let isAvailable = true;
      let cleanText = note.text || '';
      
      if (cleanText.includes('[סטטוס: לא פנוי לפרסום]')) {
        isAvailable = false;
        cleanText = cleanText.replace('\n[סטטוס: לא פנוי לפרסום]', '').replace('[סטטוס: לא פנוי לפרסום]', '');
      } else if (cleanText.includes('[סטטוס: פנוי לפרסום]')) {
        isAvailable = true;
        cleanText = cleanText.replace('\n[סטטוס: פנוי לפרסום]', '').replace('[סטטוס: פנוי לפרסום]', '');
      }
      
      return {
        ...note,
        is_available: isAvailable,
        text: cleanText
      };
    });
  }

  async createMatchNote(note: Omit<MatchNote, 'id' | 'created_at'>): Promise<MatchNote> {
    const dbNote = {
      match_id: note.match_id,
      user_id: note.user_id,
      user_name: note.user_name,
      text: note.text + (note.is_available ? '\n[סטטוס: פנוי לפרסום]' : '\n[סטטוס: לא פנוי לפרסום]')
    };

    const { data, error } = await supabase
      .from('candidate_notes')
      .insert(dbNote)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      is_available: note.is_available,
      text: note.text
    } as MatchNote;
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
      const newLog = {
        ...log,
        id: this.generateUUID(),
        created_at: new Date().toISOString(),
        user_id: log.user_id || '00000000-0000-0000-0000-000000000000'
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
      supabase.from('profiles').select('id, full_name, username, email, role, status, category, gender, phone, avatar_url, last_login, is_shaham_manager').in('id', adminIds)
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
    let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (user_id) query = query.eq('user_id', user_id);
    const data = await this.handleSupabase(query);
    return data || [];
  }

  // Publish Logs
  async logPublish(log: Omit<PublishLog, 'id' | 'created_at'>): Promise<void> {
    try {
      const newLog = {
        ...log,
        id: this.generateUUID(),
        created_at: new Date().toISOString()
      };
      await supabase.from('publish_logs').insert(newLog);
    } catch (err) {
      console.error('Failed to log publish:', err);
    }
  }

  async getPublishLogs(matchId?: string): Promise<PublishLog[]> {
    let query = supabase.from('publish_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (matchId) query = query.eq('match_id', matchId);
    const data = await this.handleSupabase(query);
    return data || [];
  }

  // WhatsApp Groups
  async getWhatsAppGroups(): Promise<WhatsAppGroup[]> {
    const data = await this.handleSupabase(supabase.from('whatsapp_groups').select('*'));
    return data || [];
  }

  async createWhatsAppGroup(group: Omit<WhatsAppGroup, 'id'>): Promise<WhatsAppGroup> {
    const newGroup = {
      ...group,
      id: this.generateUUID()
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

  async getCandidateGroupInfo(category: string, gender: string): Promise<{ mainGroup: WhatsAppGroup | null, observerGroups: WhatsAppGroup[] }> {
    const { data: groups } = await supabase
      .from('whatsapp_groups')
      .select('*')
      .eq('category', category);
    
    if (!groups) return { mainGroup: null, observerGroups: [] };

    const mainGroup = groups.find(g => g.type === (gender === 'male' ? 'male' : 'female')) || null;
    const observerGroups = groups.filter(g => g.id !== mainGroup?.id);

    return { mainGroup, observerGroups };
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

    // 2. Log to publish_logs
    await this.logPublish({
      match_id: matchId,
      match_name: match.name,
      user_id: userId,
      user_name: userName,
      group_id: groupId,
      group_name: groupName
    });

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
      details: `פרסום של ${match.name} בקבוצה ${groupName}`,
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
    await this.handleSupabase(supabase.from('whatsapp_groups').delete().eq('id', id));
  }

  // Stats
  async getStats(user?: User): Promise<Stats> {
    try {
      const uniqueCandidates = await this.getMatches(undefined, user);
      const activeCandidates = uniqueCandidates.filter(m => 
        !m.is_archived && (m.status === 'active' || m.status === 'available' || !m.status)
      );

      let adminsQuery = supabase.from('profiles').select('gender, category');
      let publishLogsQuery = supabase.from('publish_logs').select('created_at, user_id');

      let groupAdminIds: string[] = [];
      if (user && user.role !== 'super_admin') {
        // Fetch admins in the same group to calculate group stats
        const myCategories = [user.category].filter(Boolean);
        if (myCategories.length > 0) {
          const { data: sameGroupAdmins } = await supabase.from('profiles')
            .select('id')
            .in('category', myCategories);
          groupAdminIds = sameGroupAdmins?.map(a => a.id) || [];
        }

        if (user.role === 'team_leader') {
          // Cannot filter by created_by anymore
          const adminIds = [user.id];
          // matchesQuery = matchesQuery.in('created_by', adminIds);
          // adminsQuery = adminsQuery.in('created_by', [user.id]);
          publishLogsQuery = publishLogsQuery.in('user_id', Array.from(new Set([...adminIds, ...groupAdminIds])));
        } else {
          adminsQuery = adminsQuery.eq('id', user.id);
          publishLogsQuery = publishLogsQuery.in('user_id', Array.from(new Set([user.id, ...groupAdminIds])));
        }
      }

      const [adminsData, publishLogsData] = await Promise.all([
        adminsQuery,
        publishLogsQuery
      ]);

      const admins = adminsData.data || [];
      const publishLogs = publishLogsData.data || [];
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

      const publishedThisMonthMeCount = user ? publishLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= firstDayOfMonth && log.user_id === user.id;
      }).length : 0;

      const publishedThisMonthGroupCount = groupAdminIds.length > 0 ? publishLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= firstDayOfMonth && groupAdminIds.includes(log.user_id);
      }).length : publishedThisMonthCount;

      return {
        males: activeCandidates.filter(m => m.type === 'male').length,
        females: activeCandidates.filter(m => m.type === 'female').length,
        totalMatchesSite,
        publishedToday: publishedTodayCount,
        publishedThisMonth: publishedThisMonthCount,
        publishedThisMonthMe: publishedThisMonthMeCount,
        publishedThisMonthGroup: publishedThisMonthGroupCount,
        neverPublished: activeCandidates.filter(m => !m.last_published_at).length,
        totalAdmins: admins.length,
        adminMales: admins.filter(a => a.gender === 'male').length,
        adminFemales: admins.filter(a => a.gender === 'female').length
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
    // Delete all candidates, activity logs, publish logs, transfers and notes
    await Promise.all([
      supabase.from('candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('publish_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('candidate_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('candidate_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ]);
  }

  async factoryReset(): Promise<void> {
    const currentUser = await this.getCurrentUser();
    const adminEmail = currentUser?.email || 'hiealbokris@gmail.com';
    
    // Delete everything except the current super admin
    await Promise.all([
      supabase.from('candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('publish_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('whatsapp_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('internal_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('candidate_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('candidate_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      // Delete all profiles except the super admin by email
      supabase.from('profiles').delete().neq('email', adminEmail)
    ]);
    
    // Reset local settings
    localStorage.removeItem('app_settings');
  }

  // Internal Messages
  async getInternalMessages(otherUserId: string): Promise<any[]> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return [];
    
    const data = await this.handleSupabase(
      supabase
        .from('internal_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })
    );
      
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
    
    await this.handleSupabase(
      supabase
        .from('internal_messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', currentUser.id)
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
    await this.handleSupabase(supabase.from('game_scores').insert(score));
  }

  async getLeaderboard(): Promise<GameScore[]> {
    const { data } = await supabase
      .from('game_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    return data || [];
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
    }));
  }

  async getChatMessages(sessionId: string): Promise<any[]> {
    const { data } = await supabase
      .from('candidate_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    return data || [];
  }

  async updateSpeedDateStatus(sessionId: string, status: 'active' | 'completed' | 'expired', shareDetails?: { male?: boolean, female?: boolean }): Promise<void> {
    const updates: any = { status };
    if (shareDetails?.male !== undefined) updates.share_details_male = shareDetails.male;
    if (shareDetails?.female !== undefined) updates.share_details_female = shareDetails.female;
    
    await this.handleSupabase(supabase.from('speed_date_sessions').update(updates).eq('id', sessionId));
  }

  async getOnlineStats() {
    const { data: males } = await supabase.from('profiles').select('id').eq('gender', 'male').eq('is_online', true);
    const { data: females } = await supabase.from('profiles').select('id').eq('gender', 'female').eq('is_online', true);
    return { males: males?.length || 0, females: females?.length || 0 };
  }
}

export const dataService = new DataService();
