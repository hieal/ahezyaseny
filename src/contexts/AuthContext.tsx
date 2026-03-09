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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Ensure loading is true at the start of initialization
      setLoading(true);
      try {
        // 1. Check Supabase session first (as requested)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session?.user) {
          const adminProfile = await dataService.getUserById(session.user.id);
          if (adminProfile) {
            setUser(adminProfile);
            localStorage.setItem('current_user', JSON.stringify(adminProfile));
          }
        } else {
          // 2. Fallback to localStorage if no Supabase session
          const localUserJson = localStorage.getItem('current_user');
          if (localUserJson) {
            try {
              const localUser = JSON.parse(localUserJson);
              setUser(localUser);
              
              // Verify local user in background to avoid blocking UI
              // but we stay in loading state until we've at least tried to get a session
            } catch (e) {
              localStorage.removeItem('current_user');
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        // Only set loading to false after all async auth checks are complete
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
