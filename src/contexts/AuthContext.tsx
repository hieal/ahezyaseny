import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  effectiveUser: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setImpersonation: (user: User | null) => void;
  isReadOnly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [effectiveUser, setEffectiveUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Ensure loading is true at the start of initialization
      setLoading(true);
      try {
        // Check for effective user in sessionStorage
        const effectiveUserJson = sessionStorage.getItem('effective_user');
        if (effectiveUserJson) {
          try {
            setEffectiveUser(JSON.parse(effectiveUserJson));
          } catch (e) {
            sessionStorage.removeItem('effective_user');
          }
        }

        // 1. Check Supabase session first (as requested)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session?.user) {
          const adminProfile = await dataService.getUserById(session.user.id);
          if (adminProfile) {
            setUser(adminProfile);
            localStorage.setItem('current_user', JSON.stringify(adminProfile));
          }
        } else {
          // 2. Fallback to sessionStorage (for impersonation) then localStorage
          const sessionUserJson = sessionStorage.getItem('current_user');
          const localUserJson = localStorage.getItem('current_user');
          const userJson = sessionUserJson || localUserJson;
          
          if (userJson) {
            try {
              const localUser = JSON.parse(userJson);
              setUser(localUser);
            } catch (e) {
              sessionStorage.removeItem('current_user');
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
        // Try to find user by email if they signed in via Google
        const email = session.user.email;
        let adminProfile = null;
        
        if (email) {
          adminProfile = await dataService.getUserByEmail(email);
        }
        
        // Fallback to ID if email lookup fails or not applicable
        if (!adminProfile) {
          adminProfile = await dataService.getUserById(session.user.id);
        }

        if (adminProfile) {
          setUser(adminProfile);
          localStorage.setItem('current_user', JSON.stringify(adminProfile));
        } else {
          // If no admin profile found for this Google account, sign them out
          // but only if it was a Google login (not a manual session restore)
          if (session.user.app_metadata.provider === 'google') {
            console.error('Google account not registered as admin:', email);
            await supabase.auth.signOut();
            setUser(null);
            localStorage.removeItem('current_user');
          }
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
      // Online status is now handled by PresenceProvider
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const setImpersonation = (impersonatedUser: User | null) => {
    setEffectiveUser(impersonatedUser);
    if (impersonatedUser) {
      sessionStorage.setItem('effective_user', JSON.stringify(impersonatedUser));
    } else {
      sessionStorage.removeItem('effective_user');
    }
  };

  const logout = async () => {
    await dataService.logout();
    await supabase.auth.signOut();
    setUser(null);
    setEffectiveUser(null);
    sessionStorage.removeItem('effective_user');
  };

  const isReadOnly = effectiveUser?.role === 'super_observer';

  return (
    <AuthContext.Provider value={{ user, effectiveUser, loading, login, logout, refreshUser, setImpersonation, isReadOnly }}>
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
