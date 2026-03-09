import { User, Match, ActivityLog, PublishLog, WhatsAppGroup, Stats } from '../types';
import { supabase, supabaseAdmin } from './supabase';

export type BackendMode = 'temporary' | 'production';

const SCHEMA_SQL = `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
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
  daily_message_template_male TEXT,
  daily_message_template_female TEXT,
  is_from_file INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 0,
  is_shaham_manager INTEGER DEFAULT 0,
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
  is_published_confirmed INTEGER DEFAULT 0,
  crop_config TEXT,
  creation_source TEXT
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

-- Create publish_logs table
CREATE TABLE IF NOT EXISTS public.publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID,
  match_name TEXT,
  user_id UUID,
  user_name TEXT,
  group_name TEXT,
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

-- Ensure columns exist (in case table was created in older version)
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS match_id UUID;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS match_name TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS match_type TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS match_age INTEGER;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS match_city TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.internal_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Disable RLS for all tables to allow prototype access (The "Switch")
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages DISABLE ROW LEVEL SECURITY;

-- Storage Setup: Create 'images' bucket and set public access
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'images');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'images');

-- Insert initial admin user
INSERT INTO public.admins (id, name, username, email, role, password_plain, password, status, is_approved)
VALUES ('b724069c-2a51-4c99-9dcb-178e488d6b4b', 'מנהל ראשי', 'god', 'admin@example.com', 'super_admin', 'good', 'good', 'active', 1)
ON CONFLICT (id) DO UPDATE SET name = 'מנהל ראשי', username = 'god', password_plain = 'good', password = 'good';

-- Delete the old 'good' user if it exists to prevent duplicates
DELETE FROM public.admins WHERE username = 'good' AND id != 'b724069c-2a51-4c99-9dcb-178e488d6b4b';
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
        if (error.code === '42703' || (error.message && error.message.includes('does not exist'))) {
          console.warn(`Missing column detected: ${error.message}. Please run the SQL migration.`);
          return null; // Return null instead of throwing to prevent crash
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
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: SCHEMA_SQL });
      if (error) {
        console.error('Schema sync RPC error:', error);
        return { 
          success: false, 
          message: 'לא ניתן היה לסנכרן אוטומטית. אנא הרץ את ה-SQL ידנית ב-Supabase Dashboard.' 
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
        await supabase.from('admins').update({ 
          last_seen: new Date().toISOString(),
          is_online: true 
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
          .from('admins')
          .select('*, deleted_at')
          .eq('username', user.username)
          .limit(1)
          .single()
      );
        
      if (!data) {
        if (sessionUserJson) sessionStorage.removeItem('current_user');
        else localStorage.removeItem('current_user');
        return null;
      }
      
      const updatedUser: User = {
        id: data.id,
        name: data.display_name || data.name || 'מנהל ראשי',
        username: data.username,
        email: data.email || '',
        password_plain: data.password_plain,
        role: data.role || 'super_admin',
        status: data.status || 'active',
        created_at: data.created_at || new Date().toISOString(),
        category: data.category || null,
        secondary_category: data.secondary_category || null,
        gender: data.gender || null,
        phone: data.phone || null,
        google_login_allowed: data.google_login_allowed || 'false',
        avatar_url: data.avatar_url || null,
        deleted_at: data.deleted_at || null,
        daily_message_template: data.daily_message_template || null,
        daily_message_template_male: data.daily_message_template_male || null,
        daily_message_template_female: data.daily_message_template_female || null,
        is_from_file: data.is_from_file || 0,
        is_approved: data.is_approved || 0,
        is_shaham_manager: data.is_shaham_manager || 0
      };
      
      if (sessionUserJson) sessionStorage.setItem('current_user', JSON.stringify(updatedUser));
      else localStorage.setItem('current_user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (err) {
      return user;
    }
  }

  async login(usernameOrEmailOrPhone: string, password_plain: string): Promise<User | null> {
    try {
      const cleanPhone = usernameOrEmailOrPhone.replace(/\D/g, '');
      let query = supabase.from('admins').select('*, deleted_at');
      
      // Build OR query for username, email, or phone
      let orConditions = `username.eq."${usernameOrEmailOrPhone}",email.eq."${usernameOrEmailOrPhone}"`;
      if (cleanPhone.length >= 9) {
        orConditions += `,phone.ilike."%${cleanPhone}%"`;
      }
      
      query = query.or(orConditions);
      
      const data = await this.handleSupabase(query);
      
      if (!data || (data as any[]).length === 0) {
        // Fallback for system admin if DB is empty or not synced
        if (usernameOrEmailOrPhone === 'god' && password_plain === 'good') {
          return {
            id: 'b724069c-2a51-4c99-9dcb-178e488d6b4b',
            name: 'מנהל ראשי',
            username: 'god',
            email: 'admin@example.com',
            password_plain: 'good',
            role: 'super_admin',
            status: 'active',
            created_at: new Date().toISOString(),
            category: null,
            secondary_category: null,
            gender: null,
            phone: null,
            google_login_allowed: 'false',
            avatar_url: null,
            deleted_at: null,
            daily_message_template: null,
            daily_message_template_male: null,
            daily_message_template_female: null,
            is_from_file: 0,
            is_approved: 1,
            is_shaham_manager: 0
          };
        }
        return null;
      }
      
      const user = (data as any[]).find(u => u.password_plain === password_plain);
      
      if (user) {
        if (user.status === 'inactive') {
          throw new Error('המשתמש חסום. אנא פנה למנהל המערכת.');
        }
        
        await supabase.from('admins').update({ 
          last_seen: new Date().toISOString(),
          is_online: true 
        }).eq('id', user.id);
        
        const updatedUser = { ...user, is_online: true };
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
        return updatedUser as User;
      }
      return null;
    } catch (err: any) {
      console.error('Supabase login error:', err);
      throw new Error(err.message || 'שגיאה בהתחברות לשרת');
    }
  }

  async logout(): Promise<void> {
    const userJson = localStorage.getItem('current_user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        await supabase.from('admins').update({ 
          is_online: false,
          last_seen: new Date().toISOString()
        }).eq('id', user.id);
      } catch (err) {
        console.error('Error updating online status on logout', err);
      }
    }
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('current_user');
  }

  async updateOnlineStatus(user: User): Promise<void> {
    const now = new Date().toISOString();
    await supabase.from('admins').update({ 
      last_seen: now,
      is_online: true 
    }).eq('id', user.id);
  }

  private sanitizeAdmin(user: any): any {
    const allowedFields = [
      'name', 'username', 'email', 'password', 'password_plain', 'role', 
      'status', 'category', 'secondary_category', 'gender', 'phone', 
      'google_login_allowed', 'avatar_url', 'deleted_at', 'daily_message_template', 
      'daily_message_template_male', 'daily_message_template_female', 
      'is_from_file', 'is_approved', 'is_shaham_manager', 'password_updated_at', 
      'assigned_group_id', 'created_by', 'creator_name', 'created_at'
    ];
    
    const sanitized: any = {};
    allowedFields.forEach(field => {
      if (user[field] !== undefined) {
        sanitized[field] = user[field];
      }
    });
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
        sanitized[field] = match[field];
      }
    });
    return sanitized;
  }

  // Matches (Candidates)
  async getMatches(type?: 'male' | 'female', user?: User): Promise<Match[]> {
    let query = supabase.from('candidates').select('*, deleted_at').is('deleted_at', null);
    if (type) query = query.eq('type', type);
    
    if (user && user.role !== 'super_admin') {
      if (user.role === 'team_leader') {
        // Fetch all admins created by this team leader
        const { data: subAdmins } = await supabase.from('admins').select('id').eq('created_by', user.id);
        const adminIds = [user.id, ...(subAdmins?.map(a => a.id) || [])];
        query = query.in('created_by', adminIds);
      } else {
        // Regular admin only sees their own
        query = query.eq('created_by', user.id);
      }
    }
    
    const data = await this.handleSupabase(query);
    return data || [];
  }

  async createMatch(match: Omit<Match, 'id' | 'created_at'>): Promise<Match> {
    const currentUserJson = localStorage.getItem('current_user');
    const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;

    const newMatch: any = {
      ...match,
      created_at: new Date().toISOString(),
      publish_count: 0,
      last_published_at: null,
      deleted_at: null,
      is_published_confirmed: 0,
      created_by: match.created_by || currentUser?.id,
      creator_name: match.creator_name || currentUser?.name,
      creator_category: match.creator_category || currentUser?.category,
      creator_gender: match.creator_gender || currentUser?.gender,
      creator_phone: match.creator_phone || currentUser?.phone
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

    const data = await this.handleSupabase(supabase.from('candidates').update(sanitized).eq('id', id).select().single());
    return data as Match;
  }

  async deleteMatch(id: string): Promise<void> {
    await this.handleSupabase(supabase.from('candidates').update({ deleted_at: new Date().toISOString() }).eq('id', id));
  }

  // Users (Admins)
  async getUsers(): Promise<User[]> {
    const data = await this.handleSupabase(supabase.from('admins').select('*').is('deleted_at', null));
    return data || [];
  }

  async getUserById(id: string): Promise<User | null> {
    const data = await this.handleSupabase(
      supabase.from('admins').select('*').eq('id', id).single()
    );
    return data as User;
  }

  async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const currentUser = await this.getCurrentUser();
    const newUser: any = {
      ...user,
      created_at: new Date().toISOString(),
      password_plain: user.password_plain || '12345678',
      created_by: currentUser?.id
    };

    const sanitized = this.sanitizeAdmin(newUser);
    const data = await this.handleSupabase(supabase.from('admins').insert(sanitized).select().single());
    return data as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    if (updates.password_plain) {
      updates.password_updated_at = new Date().toISOString();
    }
    const sanitized = this.sanitizeAdmin(updates);
    const data = await this.handleSupabase(supabase.from('admins').update(sanitized).eq('id', id).select().single());
    return data as User;
  }

  async deleteUser(id: string): Promise<void> {
    await this.handleSupabase(supabase.from('admins').update({ deleted_at: new Date().toISOString() }).eq('id', id));
  }

  // Images
  getPublicImageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
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
    const [admins, candidates] = await Promise.all([
      supabase.from('admins').select('id, name, avatar_url').is('deleted_at', null),
      supabase.from('candidates').select('id, name, image_url').is('deleted_at', null)
    ]);

    const inventory: any[] = [];

    if (admins.data) {
      admins.data.forEach(a => {
        if (a.avatar_url) {
          inventory.push({
            id: a.id,
            name: a.name,
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
            type: 'candidate',
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

    const table = type === 'admin' ? 'admins' : 'candidates';
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

  async updateCandidateImage(candidateId: string, imageUrl: string) {
    const { error } = await supabase
      .from('candidates')
      .update({ image_url: imageUrl })
      .eq('id', candidateId);
    
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

  async recordPublish(matchId: string, groupName: string, userId: string, userName: string) {
    await this.logPublish({
      match_id: matchId,
      match_name: '', // Should be fetched if needed
      user_id: userId,
      user_name: userName,
      group_name: groupName
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
      let matchesQuery = supabase.from('candidates').select('type, publish_count, created_by').is('deleted_at', null);
      let adminsQuery = supabase.from('admins').select('gender, created_by').is('deleted_at', null);

      if (user && user.role !== 'super_admin') {
        if (user.role === 'team_leader') {
          const { data: subAdmins } = await supabase.from('admins').select('id').eq('created_by', user.id);
          const adminIds = [user.id, ...(subAdmins?.map(a => a.id) || [])];
          matchesQuery = matchesQuery.in('created_by', adminIds);
          // For team leader, stats might still show all admins or just their team? 
          // Usually stats for "total admins" is global or team-based. Let's keep it team-based if filtered.
          adminsQuery = adminsQuery.in('created_by', [user.id]); // Admins created by them
        } else {
          matchesQuery = matchesQuery.eq('created_by', user.id);
          adminsQuery = adminsQuery.eq('id', user.id);
        }
      }

      const [matchesData, adminsData] = await Promise.all([
        matchesQuery,
        adminsQuery
      ]);

      const matches = matchesData.data || [];
      const admins = adminsData.data || [];

      return {
        males: matches.filter(m => m.type === 'male').length,
        females: matches.filter(m => m.type === 'female').length,
        publishedToday: matches.filter(m => m.publish_count > 0).length,
        neverPublished: matches.filter(m => m.publish_count === 0).length,
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
    // Delete all candidates, activity logs, and publish logs
    await Promise.all([
      supabase.from('candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('publish_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ]);
  }

  async factoryReset(): Promise<void> {
    const currentUser = await this.getCurrentUser();
    
    // Delete everything except the current super admin
    await Promise.all([
      supabase.from('candidates').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('publish_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('whatsapp_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('internal_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      // Delete all admins except the current one
      supabase.from('admins').delete().neq('id', currentUser?.id || '00000000-0000-0000-0000-000000000000')
    ]);
    
    // Re-sync schema to restore default admins (like 'good' and 'god')
    await this.syncSchema();
    
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

  async sendInternalMessage(message: any): Promise<any> {
    const data = await this.handleSupabase(
      supabase
        .from('internal_messages')
        .insert({
          ...message,
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
}

export const dataService = new DataService();
