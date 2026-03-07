import { getSupabase } from '../lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export class DatabaseService {
  /**
   * Simple health check to ensure core tables are accessible.
   */
  static async ensureInitialized(customClient?: SupabaseClient) {
    const client = customClient || getSupabase();
    try {
      const { error: adminsError } = await client.from('admins').select('id').limit(1);
      const { error: matchesError } = await client.from('matches').select('id').limit(1);
      
      if (adminsError || matchesError) {
        console.error('Database check failed:', { adminsError, matchesError });
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error checking database status:', err);
      return false;
    }
  }

  /**
   * Fetch all admins from the database.
   */
  static async getAllAdmins(customClient?: SupabaseClient) {
    const client = customClient || getSupabase();
    const { data, error } = await client
      .from('admins')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching admins:', error);
      return [];
    }
    return data;
  }

  /**
   * Fetch all matches from the database.
   */
  static async getAllMatches(customClient?: SupabaseClient) {
    const client = customClient || getSupabase();
    const { data, error } = await client
      .from('matches')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
    return data;
  }
}
