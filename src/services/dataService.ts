import { User, Match, ActivityLog, PublishLog, WhatsAppGroup, Stats } from '../types';
import { supabase } from './supabase';

export type BackendMode = 'temporary' | 'production';

class DataService {
  private mode: BackendMode = (localStorage.getItem('backend_mode') as BackendMode) || 'temporary';

  setMode(mode: BackendMode) {
    this.mode = mode;
    localStorage.setItem('backend_mode', mode);
  }

  getMode(): BackendMode {
    return this.mode;
  }

  private async localGet<T>(key: string): Promise<T[]> {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private async localSet<T>(key: string, data: T[]): Promise<void> {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private async handleSupabase<T>(promise: PromiseLike<{ data: T | null; error: any }>): Promise<T | null> {
    try {
      const { data, error } = await promise;
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Supabase error:', err);
      throw new Error('שגיאה בחיבור לשרת. אנא עבור לשרת זמני בהגדרות.');
    }
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
  async getCurrentUser(): Promise<User | null> {
    // Check sessionStorage first (for impersonation in new tabs)
    const sessionUserJson = sessionStorage.getItem('current_user');
    const localUserJson = localStorage.getItem('current_user');
    const userJson = sessionUserJson || localUserJson;

    if (!userJson) return null;
    
    const user: User = JSON.parse(userJson);
    
    if (this.mode === 'temporary') {
      return user;
    } else {
      // In production mode, verify the user still exists in the admins table
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .eq('username', user.username)
          .limit(1)
          .single();
          
        if (error || !data) {
          if (sessionUserJson) sessionStorage.removeItem('current_user');
          else localStorage.removeItem('current_user');
          return null;
        }
        
        // Return updated user data
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
        return user; // Fallback to cached user if network fails
      }
    }
  }

  async login(username: string, password_plain: string): Promise<User | null> {
    if (this.mode === 'temporary') {
      let users = await this.localGet<User>('mock_admins');
      
      // Ensure 'good' user exists
      if (!users.find(u => u.username === 'good')) {
        const goodUser: User = {
          id: this.generateUUID(),
          name: 'Good User',
          username: 'good',
          email: 'good@example.com',
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
        users.push(goodUser);
        await this.localSet('mock_admins', users);
      }

      const cleanInput = username.replace(/\D/g, '');
      const userIndex = users.findIndex(u => {
        const matchUsername = u.username === username;
        const matchPhone = u.phone === username;
        const storedPhoneClean = u.phone ? u.phone.replace(/\D/g, '') : '';
        const matchCleanPhone = cleanInput.length >= 9 && storedPhoneClean === cleanInput;
        return (matchUsername || matchPhone || matchCleanPhone) && u.password_plain === password_plain;
      });

      if (userIndex !== -1) {
        // Update last_seen and is_online
        users[userIndex].last_seen = new Date().toISOString();
        users[userIndex].is_online = true;
        await this.localSet('mock_admins', users);
        
        localStorage.setItem('current_user', JSON.stringify(users[userIndex]));
        return users[userIndex];
      }
      return null;
    } else {
      // Production mode - query admins table
      const cleanInput = username.replace(/\D/g, '');
      let queryStr = `username.eq.${username},phone.eq.${username}`;
      
      if (cleanInput.length >= 9) {
        queryStr += `,phone.eq.${cleanInput}`;
      }

      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .or(queryStr)
        .limit(1)
        .single();
        
      if (error || !data) {
        throw new Error('משתמש לא קיים בסופאבייס');
      }
      
      if (data.password_plain !== password_plain) {
        throw new Error('סיסמה שגויה');
      }
      
      // Update last_seen
      await supabase.from('admins').update({ 
        last_seen: new Date().toISOString(),
        is_online: true 
      }).eq('id', data.id);

      const user: User = {
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
        is_shaham_manager: data.is_shaham_manager || 0,
        last_seen: new Date().toISOString(),
        is_online: true
      };
      
      localStorage.setItem('current_user', JSON.stringify(user));
      return user;
    }
  }

  async logout(): Promise<void> {
    const userJson = localStorage.getItem('current_user');
    if (userJson) {
      const user: User = JSON.parse(userJson);
      if (this.mode === 'temporary') {
        const users = await this.localGet<User>('mock_admins');
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          users[index].is_online = false;
          users[index].last_seen = new Date().toISOString();
          await this.localSet('mock_admins', users);
        }
      } else {
        await supabase.from('admins').update({ is_online: false, last_seen: new Date().toISOString() }).eq('id', user.id);
      }
    }
    localStorage.removeItem('current_user');
    if (this.mode === 'production') {
      await supabase.auth.signOut();
    }
  }

  async heartbeat(): Promise<void> {
    const userJson = localStorage.getItem('current_user');
    if (!userJson) return;
    
    const user: User = JSON.parse(userJson);
    const now = new Date().toISOString();

    if (this.mode === 'temporary') {
      const users = await this.localGet<User>('mock_admins');
      const index = users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        users[index].last_seen = now;
        users[index].is_online = true;
        await this.localSet('mock_admins', users);
      }
    } else {
      await supabase.from('admins').update({ 
        last_seen: now,
        is_online: true 
      }).eq('id', user.id);
    }
  }

  // Matches
  async getMatches(type?: 'male' | 'female'): Promise<Match[]> {
    if (this.mode === 'temporary') {
      const matches = await this.localGet<Match>('matches');
      return type ? matches.filter(m => m.type === type && !m.deleted_at) : matches.filter(m => !m.deleted_at);
    } else {
      try {
        let query = supabase.from('matches').select('*').is('deleted_at', null);
        if (type) query = query.eq('type', type);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Supabase error:', err);
        throw new Error('שגיאה בחיבור לשרת. אנא עבור לשרת זמני בהגדרות.');
      }
    }
  }

  async createMatch(match: Omit<Match, 'id' | 'created_at'>): Promise<Match> {
    const newMatch: Match = {
      ...match,
      id: this.generateUUID(),
      created_at: new Date().toISOString(),
      publish_count: 0,
      last_published_at: null,
      deleted_at: null,
      is_published_confirmed: 0
    };

    if (this.mode === 'temporary') {
      const matches = await this.localGet<Match>('matches');
      matches.push(newMatch);
      await this.localSet('matches', matches);
      return newMatch;
    } else {
      const data = await this.handleSupabase(supabase.from('matches').insert(newMatch).select().single());
      return data as Match;
    }
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match> {
    if (this.mode === 'temporary') {
      const matches = await this.localGet<Match>('matches');
      const index = matches.findIndex(m => m.id === id);
      if (index === -1) throw new Error('Match not found');
      matches[index] = { ...matches[index], ...updates };
      await this.localSet('matches', matches);
      return matches[index];
    } else {
      const data = await this.handleSupabase(supabase.from('matches').update(updates).eq('id', id).select().single());
      return data as Match;
    }
  }

  async deleteMatch(id: string): Promise<void> {
    if (this.mode === 'temporary') {
      const matches = await this.localGet<Match>('matches');
      const index = matches.findIndex(m => m.id === id);
      if (index !== -1) {
        matches[index].deleted_at = new Date().toISOString();
        await this.localSet('matches', matches);
      }
    } else {
      await supabase.from('matches').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    }
  }

  // Stats
  async getStats(): Promise<Stats> {
    if (this.mode === 'temporary') {
      const matches = await this.localGet<Match>('matches');
      const activeMatches = matches.filter(m => !m.deleted_at);
      const today = new Date().toISOString().split('T')[0];
      
      const users = await this.localGet<User>('mock_admins');
      const activeAdmins = users.filter(u => u.status === 'active');

      return {
        males: activeMatches.filter(m => m.type === 'male').length,
        females: activeMatches.filter(m => m.type === 'female').length,
        publishedToday: activeMatches.filter(m => m.last_published_at?.startsWith(today)).length,
        neverPublished: activeMatches.filter(m => !m.last_published_at).length,
        totalAdmins: activeAdmins.length,
        adminMales: activeAdmins.filter(u => u.gender === 'male').length,
        adminFemales: activeAdmins.filter(u => u.gender === 'female').length
      };
    } else {
      // In a real app, you'd use a RPC or multiple queries
      const matches = await this.handleSupabase(supabase.from('matches').select('type, last_published_at').is('deleted_at', null));
      const activeMatches = matches || [];
      const today = new Date().toISOString().split('T')[0];

      const { data: users } = await supabase.from('admins').select('gender, status').eq('status', 'active');
      const activeAdmins = users || [];

      return {
        males: activeMatches.filter((m: any) => m.type === 'male').length,
        females: activeMatches.filter((m: any) => m.type === 'female').length,
        publishedToday: activeMatches.filter((m: any) => m.last_published_at?.startsWith(today)).length,
        neverPublished: activeMatches.filter((m: any) => !m.last_published_at).length,
        totalAdmins: activeAdmins.length,
        adminMales: activeAdmins.filter((u: any) => u.gender === 'male').length,
        adminFemales: activeAdmins.filter((u: any) => u.gender === 'female').length
      };
    }
  }

  // Users
  async getUsers(): Promise<User[]> {
    if (this.mode === 'temporary') {
      return this.localGet<User>('mock_admins');
    } else {
      const data = await this.handleSupabase(supabase.from('admins').select('*'));
      return data || [];
    }
  }

  async getUserById(id: string): Promise<User | null> {
    if (this.mode === 'temporary') {
      const users = await this.localGet<User>('mock_admins');
      return users.find(u => u.id === id) || null;
    } else {
      const { data, error } = await supabase.from('admins').select('*').eq('id', id).single();
      if (error) return null;
      return data as User;
    }
  }

  async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.generateUUID(),
      created_at: new Date().toISOString(),
      password_plain: user.password_plain || '12345678' // Default password if not provided
    };

    if (this.mode === 'temporary') {
      const users = await this.localGet<User>('mock_admins');
      users.push(newUser);
      await this.localSet('mock_admins', users);
      return newUser;
    } else {
      const data = await this.handleSupabase(supabase.from('admins').insert(newUser).select().single());
      return data as User;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    if (this.mode === 'temporary') {
      const users = await this.localGet<User>('mock_admins');
      const index = users.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');
      
      // If password is being updated, update password_plain as well
      if (updates.password_plain) {
        updates.password_updated_at = new Date().toISOString();
      }

      users[index] = { ...users[index], ...updates };
      await this.localSet('mock_admins', users);
      
      // Update current user if it's the same
      const currentUser = localStorage.getItem('current_user');
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        if (parsed.id === id) {
          localStorage.setItem('current_user', JSON.stringify(users[index]));
        }
      }
      
      return users[index];
    } else {
      if (updates.password_plain) {
        updates.password_updated_at = new Date().toISOString();
      }
      const data = await this.handleSupabase(supabase.from('admins').update(updates).eq('id', id).select().single());
      return data as User;
    }
  }

  async deleteUser(id: string): Promise<void> {
    if (this.mode === 'temporary') {
      const users = await this.localGet<User>('mock_admins');
      const filtered = users.filter(u => u.id !== id);
      await this.localSet('mock_admins', filtered);
    } else {
      await supabase.from('admins').delete().eq('id', id);
    }
  }

  // Activity Logs
  async logActivity(log: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> {
    const newLog: ActivityLog = {
      ...log,
      id: this.generateUUID(),
      created_at: new Date().toISOString()
    };

    if (this.mode === 'temporary') {
      const logs = await this.localGet<ActivityLog>('activity_logs');
      logs.unshift(newLog);
      await this.localSet('activity_logs', logs.slice(0, 1000));
    } else {
      await supabase.from('activity_logs').insert(newLog);
    }
  }

  // WhatsApp Groups
  async getWhatsAppGroups(): Promise<WhatsAppGroup[]> {
    if (this.mode === 'temporary') {
      return this.localGet<WhatsAppGroup>('whatsapp_groups');
    } else {
      const data = await this.handleSupabase(supabase.from('whatsapp_groups').select('*'));
      return data || [];
    }
  }

  async createWhatsAppGroup(group: Omit<WhatsAppGroup, 'id'>): Promise<WhatsAppGroup> {
    const newGroup: WhatsAppGroup = {
      ...group,
      id: this.generateUUID(),
      last_initial_sent: null
    };

    if (this.mode === 'temporary') {
      const groups = await this.localGet<WhatsAppGroup>('whatsapp_groups');
      groups.push(newGroup);
      await this.localSet('whatsapp_groups', groups);
      return newGroup;
    } else {
      const data = await this.handleSupabase(supabase.from('whatsapp_groups').insert(newGroup).select().single());
      return data as WhatsAppGroup;
    }
  }

  async updateWhatsAppGroup(id: string, updates: Partial<WhatsAppGroup>): Promise<WhatsAppGroup> {
    if (this.mode === 'temporary') {
      const groups = await this.localGet<WhatsAppGroup>('whatsapp_groups');
      const index = groups.findIndex(g => g.id === id);
      if (index === -1) throw new Error('Group not found');
      groups[index] = { ...groups[index], ...updates };
      await this.localSet('whatsapp_groups', groups);
      return groups[index];
    } else {
      const data = await this.handleSupabase(supabase.from('whatsapp_groups').update(updates).eq('id', id).select().single());
      return data as WhatsAppGroup;
    }
  }

  async deleteWhatsAppGroup(id: string): Promise<void> {
    if (this.mode === 'temporary') {
      const groups = await this.localGet<WhatsAppGroup>('whatsapp_groups');
      const filtered = groups.filter(g => g.id !== id);
      await this.localSet('whatsapp_groups', filtered);
    } else {
      await supabase.from('whatsapp_groups').delete().eq('id', id);
    }
  }

  async markInitialSent(groupId: string): Promise<void> {
    const today = new Date().toISOString();
    if (this.mode === 'temporary') {
      const groups = await this.localGet<WhatsAppGroup>('whatsapp_groups');
      const index = groups.findIndex(g => g.id === groupId);
      if (index !== -1) {
        groups[index].last_initial_sent = today;
        await this.localSet('whatsapp_groups', groups);
      }
    } else {
      await supabase.from('whatsapp_groups').update({ last_initial_sent: today }).eq('id', groupId);
    }
  }

  // Publish Logs
  async recordPublish(matchId: string, groupName: string, userId: string, userName: string): Promise<void> {
    const now = new Date().toISOString();
    const newLog: PublishLog = {
      id: this.generateUUID(),
      match_id: matchId,
      match_name: '', // Will be filled if needed or handled by DB
      user_id: userId,
      user_name: userName,
      group_name: groupName,
      created_at: now
    };

    if (this.mode === 'temporary') {
      const logs = await this.localGet<PublishLog>('publish_logs');
      logs.unshift(newLog);
      await this.localSet('publish_logs', logs);

      // Update match stats
      const matches = await this.localGet<Match>('matches');
      const index = matches.findIndex(m => m.id === matchId);
      if (index !== -1) {
        matches[index].last_published_at = now;
        matches[index].publish_count = (matches[index].publish_count || 0) + 1;
        await this.localSet('matches', matches);
      }
    } else {
      await supabase.from('publish_logs').insert(newLog);
      // Supabase trigger or manual update for match
      const { data: match } = await supabase.from('matches').select('publish_count').eq('id', matchId).single();
      await supabase.from('matches').update({
        last_published_at: now,
        publish_count: (match?.publish_count || 0) + 1
      }).eq('id', matchId);
    }
  }

  async getPublishLogs(matchId: string): Promise<PublishLog[]> {
    if (this.mode === 'temporary') {
      const logs = await this.localGet<PublishLog>('publish_logs');
      return logs.filter(l => l.match_id === matchId);
    } else {
      const { data } = await supabase.from('publish_logs').select('*').eq('match_id', matchId).order('created_at', { ascending: false });
      return data || [];
    }
  }

  // Settings
  async getSettings(): Promise<any> {
    if (this.mode === 'temporary') {
      const settings = localStorage.getItem('app_settings');
      return settings ? JSON.parse(settings) : {};
    } else {
      try {
        const { data } = await supabase.from('settings').select('*');
        const settings: any = {};
        data?.forEach((item: any) => {
          settings[item.key] = item.value;
        });
        return settings;
      } catch (e) {
        return {};
      }
    }
  }

  async updateSetting(key: string, value: string): Promise<void> {
    if (this.mode === 'temporary') {
      const settings = await this.getSettings();
      settings[key] = value;
      localStorage.setItem('app_settings', JSON.stringify(settings));
    } else {
      // Upsert logic
      const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
    }
  }

  async updateSettings(settings: any): Promise<void> {
    // Deprecated, use updateSetting loop instead
    for (const key in settings) {
      await this.updateSetting(key, settings[key]);
    }
  }
}

export const dataService = new DataService();
