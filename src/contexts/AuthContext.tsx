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
      const isMalachi = user.phone === '0556603336';
      const isGood = user.username?.toLowerCase() === 'good' || user.email?.toLowerCase() === 'good';
      
      console.log(`Debug Auth: Profile Username: ${user.username}, Auth Username: ${user.username?.toLowerCase()}, Roles Match: ${isMalachi || isGood}.`);

      if (isMalachi) {
        return { ...user, role: 'association_manager' };
      }
      if (isGood) {
        return { ...user, role: 'super_admin' };
      }
    }
    return user;
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        const localUserJson = localStorage.getItem('current_user');
        const localUser = localUserJson ? JSON.parse(localUserJson) : null;
        
        // 1. Ensure anchors exist and check if current user is one
        const anchorUser = await dataService.ensureAnchorsExist(localUser?.id);
        
        if (anchorUser) {
          console.log(`Auth Check: Checking identity for ${anchorUser.username || anchorUser.phone}... Match found: true.`);
          setUser(anchorUser);
          localStorage.setItem('current_user', JSON.stringify(anchorUser));
          setLoading(false);
          return; // Anchor identified and state updated
        } else if (localUser) {
          console.log(`Auth Check: Checking identity for ${localUser.username || localUser.phone}... Match found: false.`);
        }

        // 2. Check Supabase session for non-anchor users
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const adminProfile = await dataService.getUserById(session.user.id);
          if (adminProfile) {
            if (isVercel() && adminProfile.is_approved === 0) {
              await supabase.auth.signOut();
              setUser(null);
              localStorage.removeItem('current_user');
              return;
            }
            const userWithRole = enforceMalachiRole(adminProfile);
            setUser(userWithRole);
            localStorage.setItem('current_user', JSON.stringify(userWithRole));
          }
        } else if (localUser) {
          // 3. Fallback to localStorage
          if (isVercel() && localUser.is_approved === 0) {
            setUser(null);
            localStorage.removeItem('current_user');
            return;
          }
          const userWithRole = enforceMalachiRole(localUser);
          setUser(userWithRole);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Try to find user by email, ID, OR username/phone for anchors
        const email = session.user.email;
        let adminProfile = null;
        
        // 1. Check by ID
        adminProfile = await dataService.getUserById(session.user.id);
        
        // 2. If not found, check by email
        if (!adminProfile && email) {
          adminProfile = await dataService.getUserByEmail(email);
        }

        // 3. Special check for anchors by username/phone if still not found
        if (!adminProfile) {
          const { data: anchorMatch } = await supabase.from('profiles')
            .select('*')
            .or(`username.eq.good,phone.eq.0556603336`)
            .maybeSingle();
          
          if (anchorMatch) {
            adminProfile = anchorMatch;
          }
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

          const isMalachi = adminProfile.phone === '0556603336';
          const isGood = adminProfile.username?.toLowerCase() === 'good';
          
          console.log(`Auth Check: Checking identity for ${adminProfile.username || adminProfile.phone}... Match found: ${isMalachi || isGood}.`);
          const targetRole = isMalachi ? 'association_manager' : 'super_admin';
          
          if ((isMalachi || isGood) && adminProfile.role !== targetRole) {
            await dataService.updateUser(adminProfile.id, { role: targetRole });
          }
          const userWithRole = enforceMalachiRole(adminProfile);
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
    if (user && (user.username?.toLowerCase() === 'good' || user.email?.toLowerCase() === 'good')) {
      dataService.updateUser(user.id, { 
        is_online: true, 
        last_seen: new Date().toISOString() 
      }).catch(err => console.error('Failed to update online status for good:', err));
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
    const isGood = userData.username?.toLowerCase() === 'good' || userData.email?.toLowerCase() === 'good';
    
    console.log(`Auth Check: Checking identity for ${userData.username || userData.phone}... Match found: ${isMalachi || isGood}.`);

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
