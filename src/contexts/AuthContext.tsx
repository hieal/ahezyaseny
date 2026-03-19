import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { isVercel } from '../utils/env';

interface AuthContextType {
  user: User | null;
  effectiveUser: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setImpersonation: (user: User | null) => void;
  isReadOnly: boolean;
  selectRole: (role: 'admin' | 'team_leader') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [effectiveUser, setEffectiveUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

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
          try {
            const adminProfile = await dataService.getUserById(session.user.id);
            if (adminProfile) {
              // Block unapproved users on Vercel
              if (isVercel() && adminProfile.is_approved === 0) {
                console.error('Account not approved for Vercel:', session.user.email);
                await supabase.auth.signOut();
                setUser(null);
                localStorage.removeItem('current_user');
                sessionStorage.removeItem('current_user');
                return;
              }
              setUser(adminProfile);
              localStorage.setItem('current_user', JSON.stringify(adminProfile));
            }
          } catch (err) {
            console.error('Error fetching admin profile:', err);
            // Don't throw, just log and continue to allow local storage fallback
          }
        } else {
          // 2. Fallback to sessionStorage (for impersonation) then localStorage
          const sessionUserJson = sessionStorage.getItem('current_user');
          const localUserJson = localStorage.getItem('current_user');
          const userJson = sessionUserJson || localUserJson;
          
          if (userJson) {
            try {
              const localUser = JSON.parse(userJson);
              // Block unapproved users on Vercel
              if (isVercel() && localUser.is_approved === 0) {
                setUser(null);
                localStorage.removeItem('current_user');
                sessionStorage.removeItem('current_user');
                return;
              }
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
      setEffectiveUser(userData);
      localStorage.setItem('current_user', JSON.stringify(userData));
      sessionStorage.setItem('current_user', JSON.stringify(userData));
    }
  };

  const selectRole = (role: 'admin' | 'team_leader') => {
    if (!pendingUser) return;
    
    const effective = { ...pendingUser };
    if (role === 'team_leader') {
      effective.role = 'team_leader';
    } else {
      effective.role = 'admin';
    }
    
    setUser(pendingUser);
    setEffectiveUser(effective);
    localStorage.setItem('current_user', JSON.stringify(pendingUser));
    sessionStorage.setItem('current_user', JSON.stringify(pendingUser));
    sessionStorage.setItem('effective_user', JSON.stringify(effective));
    setShowRolePicker(false);
    setPendingUser(null);
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

  const isReadOnly = user?.role === 'super_observer' || effectiveUser?.role === 'super_observer';

  return (
    <AuthContext.Provider value={{ user, effectiveUser, loading, login, logout, refreshUser, setImpersonation, isReadOnly, selectRole }}>
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
