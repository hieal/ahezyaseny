import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      // Check local storage for super admin session first
      const superAdminSession = localStorage.getItem('super_admin_session');
      if (superAdminSession === 'true') {
        setUser({
          id: 0,
          name: 'מנהל ראשי',
          username: 'admin',
          email: 'admin@shidduchim.com',
          role: 'super_admin',
          status: 'active',
          category: null,
          secondary_category: null,
          gender: null,
          phone: null,
          google_login_allowed: 'true',
          avatar_url: null,
          is_from_file: 0,
          is_approved: 1,
          created_at: new Date().toISOString()
        } as User);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Fetch from admins table
        const { data: admin, error } = await supabase
          .from('admins')
          .select('*')
          .eq('email', session.user.email)
          .is('deleted_at', null)
          .single();
          
        if (admin) {
          setUser(admin as User);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        refreshUser();
      } else if (localStorage.getItem('super_admin_session') !== 'true') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('super_admin_session');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
