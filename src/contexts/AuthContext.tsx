import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { isVercel } from '../utils/env';

interface AuthContextType {
  user: User | null;
  activeRole: 'admin' | 'team_leader' | 'observer_manager' | 'association_manager' | 'super_admin' | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isReadOnly: boolean;
  isSafeMode: boolean;
  setSafeMode: (enabled: boolean) => void;
  impersonatedUser: User | null;
  setImpersonatedUser: (user: User | null) => void;
  setActiveRole: (role: string | null) => void;
  selectRole: (role: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<'admin' | 'team_leader' | 'observer_manager' | 'association_manager' | 'super_admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [isSafeMode, setSafeMode] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);

  const enforceMalachiRole = (user: User | null): User | null => {
    if (user) {
      if (user.phone === '0556603336') {
        return { ...user, role: 'association_manager' };
      }
      if (user.username === 'good' || user.email === 'good') {
        return { ...user, role: 'super_admin' };
      }
    }
    return user;
  };

  useEffect(() => {
    const initAuth = async () => {
      // Background task: Ensure 'good' and Malachi have correct roles in DB
      try {
        const { data: profiles } = await supabase.from('profiles').select('id, username, email, phone, role').or('username.eq.good,email.eq.good,phone.eq.0556603336');
        if (profiles) {
          for (const p of profiles) {
            const isMalachi = p.phone === '0556603336';
            const targetRole = isMalachi ? 'association_manager' : 'super_admin';
            if (p.role !== targetRole) {
              await supabase.from('profiles').update({ role: targetRole }).eq('id', p.id);
            }
          }
        }
      } catch (e) {
        console.error('Failed to sync roles in background', e);
      }

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
              const userWithRole = enforceMalachiRole(adminProfile);
              if ((adminProfile.phone === '0556603336' || adminProfile.username === 'good' || adminProfile.email === 'good') && adminProfile.role !== 'association_manager') {
                await dataService.updateUser(adminProfile.id, { role: 'association_manager' });
              }
              setUser(userWithRole);
              localStorage.setItem('current_user', JSON.stringify(userWithRole));
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
              const userWithRole = enforceMalachiRole(localUser);
              setUser(userWithRole);
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
          const userWithRole = enforceMalachiRole(adminProfile);
          const isMalachi = adminProfile.phone === '0556603336';
          const isGood = adminProfile.username === 'good' || adminProfile.email === 'good';
          const targetRole = isMalachi ? 'association_manager' : 'super_admin';
          
          if ((isMalachi || isGood) && adminProfile.role !== targetRole) {
            await dataService.updateUser(adminProfile.id, { role: targetRole });
          }
          setUser(userWithRole);
          localStorage.setItem('current_user', JSON.stringify(userWithRole));
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
        // Don't clear local storage if it's an association_manager (they don't use Supabase Auth)
        const localUserStr = localStorage.getItem('current_user');
        if (localUserStr) {
          try {
            const localUser = JSON.parse(localUserStr);
            if (localUser.role === 'association_manager') {
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
      const userWithRole = enforceMalachiRole(currentUser);
      if (userWithRole) {
        localStorage.setItem('current_user', JSON.stringify(userWithRole));
      } else {
        localStorage.removeItem('current_user');
      }
      setUser(userWithRole);
    } catch (err) {
      setUser(null);
      localStorage.removeItem('current_user');
    }
  };

  useEffect(() => {
    if (user) {
      // Online status is now handled by PresenceProvider
    }
  }, [user]);

  useEffect(() => {
    if (user && (user.role === 'super_admin' || user.role === 'association_manager')) {
      // Run aggressive cleanup once per session for super admins
      const hasCleaned = sessionStorage.getItem('admin_cleanup_done');
      if (!hasCleaned) {
        dataService.performAdminCleanup().then(() => {
          sessionStorage.setItem('admin_cleanup_done', 'true');
          console.log('Automatic admin cleanup completed');
        });
      }
    }
  }, [user]);

  const login = (userData: User) => {
    const isMalachi = userData.phone === '0556603336';
    const isGood = userData.username === 'good' || userData.email === 'good';
    
    if (isMalachi || isGood) {
      userData.role = isMalachi ? 'association_manager' : 'super_admin';
      setUser(userData);
      setActiveRole(userData.role as any);
      localStorage.setItem('current_user', JSON.stringify(userData));
      return;
    }

    if ((userData.role === 'admin' && userData.is_team_leader) || userData.role === 'observer_manager') {
      setPendingUser(userData);
      setShowRolePicker(true);
    } else {
      setUser(userData);
      setActiveRole(userData.role as any);
      localStorage.setItem('current_user', JSON.stringify(userData));
    }
  };

  const selectRole = (role: 'admin' | 'team_leader' | 'observer_manager') => {
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

  const isReadOnly = isSafeMode || user?.role === 'observer_manager' || user?.role === 'observer' || user?.role === 'viewer';

  return (
    <AuthContext.Provider value={{ 
      user, 
      activeRole, 
      loading, 
      login, 
      logout, 
      refreshUser, 
      isReadOnly, 
      isSafeMode,
      setSafeMode,
      impersonatedUser,
      setImpersonatedUser,
      setActiveRole: (role) => setActiveRole(role as any), 
      selectRole: (role) => selectRole(role as any) 
    }}>
      {children}
      {showRolePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl">
            <h2 className="text-xl font-bold mb-4">בחר זהות לכניסה</h2>
            <div className="flex gap-4">
              <button onClick={() => selectRole('admin')} className="bg-luxury-blue text-white px-4 py-2 rounded-lg">מנהל קבוצה</button>
              <button onClick={() => selectRole('team_leader')} className="bg-luxury-blue text-white px-4 py-2 rounded-lg">ראש צוות</button>
              <button onClick={() => selectRole('observer_manager')} className="bg-luxury-blue text-white px-4 py-2 rounded-lg">צופה מנהל</button>
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
