import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { isVercel } from '../utils/env';

interface AuthContextType {
  user: User | null;
  activeRole: 'admin' | 'team_leader' | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isReadOnly: boolean;
  setActiveRole: (role: 'admin' | 'team_leader') => void;
  selectRole: (role: 'admin' | 'team_leader') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<'admin' | 'team_leader' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      // Ensure loading is true at the start of initialization
      setLoading(true);
      try {
        // 1. Check Supabase session first (as requested)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session?.user) {
          try {
            const adminProfile = await dataService.getUserById(session.user.id);
            if (adminProfile) {
              // Block unapproved users on Vercel
              if (isVercel() && adminProfile.is_approved === 0) {
                console.error('Account not approved for Vercel:', session.user.email);
                await supabase.auth.signOut();
                setUser(null);
                localStorage.removeItem('current_user');
                return;
              }
              setUser(adminProfile);
              localStorage.setItem('current_user', JSON.stringify(adminProfile));
            }
          } catch (err) {
            // Don't throw, just log and continue to allow local storage fallback
          }
        } else {
          // 2. Fallback to localStorage ONLY (removed sessionStorage for impersonation)
          const localUserJson = localStorage.getItem('current_user');
          
          if (localUserJson) {
            try {
              const localUser = JSON.parse(localUserJson);
              // Block unapproved users on Vercel
              if (isVercel() && localUser.is_approved === 0) {
                setUser(null);
                localStorage.removeItem('current_user');
                return;
              }
              setUser(localUser);
            } catch (e) {
              localStorage.removeItem('current_user');
            }
          }
        }
      } catch (err) {
        // Auth initialization error
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
          // Block unapproved users on Vercel
          if (isVercel() && adminProfile.is_approved === 0) {
            console.error('Account not approved for Vercel:', email);
            await supabase.auth.signOut();
            setUser(null);
            localStorage.removeItem('current_user');
            sessionStorage.removeItem('current_user');
            return;
          }
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
        // Don't clear local storage if it's a super_observer or god (they don't use Supabase Auth)
        const localUserStr = localStorage.getItem('current_user');
        if (localUserStr) {
          try {
            const localUser = JSON.parse(localUserStr);
            if (localUser.role === 'super_observer' || localUser.username === 'god') {
              return; // Ignore SIGNED_OUT for these special users
            }
          } catch (e) {}
        }
        
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
    if (userData.role === 'admin' && userData.is_team_leader) {
      setPendingUser(userData);
      setShowRolePicker(true);
    } else {
      setUser(userData);
      setActiveRole(userData.role as 'admin' | 'team_leader');
      localStorage.setItem('current_user', JSON.stringify(userData));
    }
  };

  const selectRole = (role: 'admin' | 'team_leader') => {
    if (!pendingUser) return;
    
    setUser(pendingUser);
    setActiveRole(role);
    localStorage.setItem('current_user', JSON.stringify(pendingUser));
    setShowRolePicker(false);
    setPendingUser(null);
  };

  const logout = async () => {
    await dataService.logout();
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('current_user');
  };

  const isReadOnly = user?.role === 'super_observer';

  return (
    <AuthContext.Provider value={{ user, activeRole, loading, login, logout, refreshUser, isReadOnly, setActiveRole: (role) => setActiveRole(role), selectRole }}>
      {children}
      {showRolePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl">
            <h2 className="text-xl font-bold mb-4">בחר זהות לכניסה</h2>
            <div className="flex gap-4">
              <button onClick={() => selectRole('admin')} className="bg-luxury-blue text-white px-4 py-2 rounded-lg">מנהל קבוצה</button>
              <button onClick={() => selectRole('team_leader')} className="bg-luxury-blue text-white px-4 py-2 rounded-lg">ראש צוות</button>
            </div>
          </div>
        </div>
      )}
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
