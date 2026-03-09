import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const localUser = localStorage.getItem('current_user');
    try {
      return localUser ? JSON.parse(localUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for Supabase session and custom session on mount
    const initAuth = async () => {
      try {
        // First check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // If we have a Supabase session, try to get the admin profile
          const adminProfile = await dataService.getUserById(session.user.id);
          if (adminProfile) {
            setUser(adminProfile);
            localStorage.setItem('current_user', JSON.stringify(adminProfile));
          }
        } else {
          // Fallback to custom localStorage session
          const currentUser = await dataService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const adminProfile = await dataService.getUserById(session.user.id);
        if (adminProfile) {
          setUser(adminProfile);
          localStorage.setItem('current_user', JSON.stringify(adminProfile));
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('current_user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    try {
      const currentUser = await dataService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
    }
  };

  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        dataService.updateOnlineStatus(user);
      }, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    await dataService.logout();
    await supabase.auth.signOut();
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
