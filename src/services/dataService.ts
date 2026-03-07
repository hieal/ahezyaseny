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

  // Auth
  async getCurrentUser(): Promise<User | null> {
    if (this.mode === 'temporary') {
      const userJson = localStorage.getItem('current_user');
      return userJson ? JSON.parse(userJson) : null;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      return profile;
    }
  }

  async login(username: string, password_plain: string): Promise<User | null> {
    if (this.mode === 'temporary') {
      const users = await this.localGet<User>('users');
      const user = users.find(u => u.username === username && u.password_plain === password_plain);
      if (user) {
        localStorage.setItem('current_user', JSON.stringify(user));
        return user;
      }
      return null;
    } else {
      // For production, we'd use Supabase Auth
      // This is a simplified version for the demo
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${username}@example.com`,
        password: password_plain,
      });
      
      if (error || !data.user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      return profile;
    }
  }

  async logout(): Promise<void> {
    if (this.mode === 'temporary') {
      localStorage.removeItem('current_user');
    } else {
      await supabase.auth.signOut();
    }
  }

  // Matches
  async getMatches(type?: 'male' | 'female'): Promise<Match[]> {
    if (this.mode === 'temporary') {
      const matches = await this.localGet<Match>('matches');
      return type ? matches.filter(m => m.type === type && !m.deleted_at) : matches.filter(m => !m.deleted_at);
    } else {
      let query = supabase.from('matches').select('*').is('deleted_at', null);
      if (type) query = query.eq('type', type);
      const { data } = await query;
      return data || [];
    }
  }

  async createMatch(match: Omit<Match, 'id' | 'created_at'>): Promise<Match> {
    const newMatch: Match = {
      ...match,
      id: crypto.randomUUID(),
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
      const { data, error } = await supabase.from('matches').insert(newMatch).select().single();
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase.from('matches').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
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
      
      return {
        males: activeMatches.filter(m => m.type === 'male').length,
        females: activeMatches.filter(m => m.type === 'female').length,
        publishedToday: activeMatches.filter(m => m.last_published_at?.startsWith(today)).length,
        neverPublished: activeMatches.filter(m => !m.last_published_at).length
      };
    } else {
      // In a real app, you'd use a RPC or multiple queries
      const { data: matches } = await supabase.from('matches').select('type, last_published_at').is('deleted_at', null);
      const activeMatches = matches || [];
      const today = new Date().toISOString().split('T')[0];

      return {
        males: activeMatches.filter(m => m.type === 'male').length,
        females: activeMatches.filter(m => m.type === 'female').length,
        publishedToday: activeMatches.filter(m => m.last_published_at?.startsWith(today)).length,
        neverPublished: activeMatches.filter(m => !m.last_published_at).length
      };
    }
  }

  // Users
  async getUsers(): Promise<User[]> {
    if (this.mode === 'temporary') {
      return this.localGet<User>('users');
    } else {
      const { data } = await supabase.from('profiles').select('*');
      return data || [];
    }
  }

  async createUser(user: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };

    if (this.mode === 'temporary') {
      const users = await this.localGet<User>('users');
      users.push(newUser);
      await this.localSet('users', users);
      return newUser;
    } else {
      const { data, error } = await supabase.from('profiles').insert(newUser).select().single();
      if (error) throw error;
      return data;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    if (this.mode === 'temporary') {
      const users = await this.localGet<User>('users');
      const index = users.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');
      users[index] = { ...users[index], ...updates };
      await this.localSet('users', users);
      
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
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
  }

  async deleteUser(id: string): Promise<void> {
    if (this.mode === 'temporary') {
      const users = await this.localGet<User>('users');
      const filtered = users.filter(u => u.id !== id);
      await this.localSet('users', filtered);
    } else {
      await supabase.from('profiles').delete().eq('id', id);
    }
  }

  // Activity Logs
  async logActivity(log: Omit<ActivityLog, 'id' | 'created_at'>): Promise<void> {
    const newLog: ActivityLog = {
      ...log,
      id: crypto.randomUUID(),
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
      const { data } = await supabase.from('whatsapp_groups').select('*');
      return data || [];
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
      id: crypto.randomUUID(),
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

  // Settings (Simplified for frontend only)
  async getSettings(): Promise<any> {
    if (this.mode === 'temporary') {
      const settings = localStorage.getItem('app_settings');
      return settings ? JSON.parse(settings) : { whatsapp_template: '', whatsapp_initial_message: '' };
    } else {
      const { data } = await supabase.from('settings').select('*').single();
      return data || {};
    }
  }

  async updateSettings(settings: any): Promise<void> {
    if (this.mode === 'temporary') {
      localStorage.setItem('app_settings', JSON.stringify(settings));
    } else {
      await supabase.from('settings').upsert(settings);
    }
  }
}

export const dataService = new DataService();
