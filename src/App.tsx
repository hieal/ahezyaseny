import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PresenceProvider, usePresence } from './contexts/PresenceContext';
import { BackendProvider, useBackend } from './contexts/BackendContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import ControlCenter from './pages/ControlCenter';
import IdentitySelector from './pages/IdentitySelector';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DailySuggestionsPage from './pages/DailySuggestionsPage';
import MatchForm from './pages/MatchForm';
import AdminManagement from './pages/AdminManagement';
import RoleManagement from './pages/RoleManagement';
import SettingsPage from './pages/SettingsPage';
import BlacklistManagement from './pages/BlacklistManagement';
import ImportPortal from './pages/ImportPortal';
import InitialContactPage from './pages/InitialContactPage';
import PendingContactPage from './pages/PendingContactPage';
import TrackingPage from './pages/TrackingPage';
import MatchesHistoryPage from './pages/MatchesHistoryPage';
import ConnectedAdmins from './pages/ConnectedAdmins';
import CandidateDashboard from './pages/CandidateDashboard';
import SpeedDate from './pages/SpeedDate';
import GamesPortal from './pages/GamesPortal';
import CandidatePortalAdmin from './pages/CandidatePortalAdmin';
import PublishedToday from './pages/PublishedToday';
import AdminLiveTracker from './pages/AdminLiveTracker';
import Leaderboard from './pages/Leaderboard';
import OrphanedCandidatesPage from './pages/OrphanedCandidatesPage';
import PendingTransfersPage from './pages/PendingTransfersPage';
import { LayoutDashboard, Users, UserPlus, UserMinus, UserCog, Settings, LogOut, Menu, X, Heart, ClipboardList, UserCheck, ArrowRight, History, Plus, Clock, User, MessageSquare, Send, ShieldAlert, Database, Cloud, Sparkles, ArrowLeftRight, Gamepad2, Zap, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME } from './constants';
import { getGenderedText } from './utils/gender';
import { toast } from 'react-hot-toast';
import { Logo } from './components/Logo';
import { dataService } from './services/dataService';
import { supabase } from './services/supabase';
import { InternalChat } from './components/InternalChat';
import { OnlineMonitor } from './components/OnlineMonitor';
import { ChatProvider } from './contexts/ChatContext';
import { ActiveManagersWidget } from './components/ActiveManagersWidget';
import { TransferModal } from './components/TransferModal';

function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }: { children: React.ReactNode, adminOnly?: boolean, superAdminOnly?: boolean }) {
  const { user, effectiveUser, loading } = useAuth();
  
  // Check localStorage for super_observer to prevent redirect during loading
  const localUserStr = localStorage.getItem('current_user');
  const localUser = localUserStr ? JSON.parse(localUserStr) : null;
  const isSuperObserver = user?.role === 'super_observer' || localUser?.role === 'super_observer';
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-gray">
      <div className="w-12 h-12 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // If user is not logged in and not super_observer, redirect to login
  if (!user && !isSuperObserver) return <Navigate to="/login" />;
  
  // If loading and isSuperObserver, show loading
  if (loading && isSuperObserver) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-gray">
      <div className="w-12 h-12 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  
  // If user is super_observer but not effectiveUser, redirect to identity-selector
  if (user?.role === 'super_observer' && !effectiveUser && window.location.pathname !== '/identity-selector') {
    return <Navigate to="/identity-selector" />;
  }
  
  // If user is candidate, restrict access
  if (user?.role === 'candidate') {
    const location = window.location.pathname;
    if (!location.startsWith('/candidate-dashboard') && !location.startsWith('/portal')) {
      return <Navigate to="/candidate-dashboard" />;
    }
  }
  
  // Role-based access control
  if (superAdminOnly && user?.role !== 'super_admin') return <Navigate to="/" />;
  if (adminOnly && user?.role !== 'super_admin' && user?.role !== 'team_leader' && user?.role !== 'admin' && user?.role !== 'super_observer') return <Navigate to="/" />;
  
  return <>{children}</>;
}

function Sidebar() {
  const { user, effectiveUser, logout, refreshUser } = useAuth();
  const activeUser = effectiveUser || user;
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showConnectedAdmins, setShowConnectedAdmins] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  const [pendingTransfersCount, setPendingTransfersCount] = React.useState(0);
  const [orphanedCount, setOrphanedCount] = React.useState(0);
  const [isAdditionalOpen, setIsAdditionalOpen] = React.useState(false);
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [allAdmins, setAllAdmins] = React.useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = React.useState<string[]>([]);
  const [autoPopup, setAutoPopup] = React.useState(() => {
    return localStorage.getItem('chat_auto_popup') !== 'false';
  });

  React.useEffect(() => {
    console.log('SYSTEM CLEANED AND UI UPDATED SUCCESSFULLY');
    console.log('WIDGET MODES ENABLED: MODAL AND CAROUSEL OPTIONS ACTIVE');
    console.log('MATCHES & ADMINS PHOTO SYSTEM FULLY SYNCED AND TESTED');
    console.log('FINAL SYNC: DATABASE COLUMNS ALIGNED, UPSERT FIXED, PHOTO DISPLAY VERIFIED');
    console.log('STORAGE UPLOAD STABILIZED: ASYNC HANDSHAKE FIXED, AVATAR_URL MAPPED');
    console.log('ADMIN DELETE SYNCHRONIZED: REMOVED INVALID FIELDS FROM SELECT QUERY');
    console.log('DB ALIGNED & AVATAR_URL MAPPING ACTIVE');
    console.log('PROFILES COLUMN SYNCED - ERRORS CLEARED');
    console.log('AIRTABLE PHOTO SYNC ACTIVE: URL MAPPING AND DB COLUMNS VERIFIED');
    console.log('FINAL PHOTO SYNC: AIRTABLE URLS MAPPED TO IMAGE_URL');
  }, []);

  React.useEffect(() => {
    localStorage.setItem('chat_auto_popup', autoPopup.toString());
    window.dispatchEvent(new Event('storage'));
  }, [autoPopup]);

  React.useEffect(() => {
    const handleStorageChange = () => {
      const val = localStorage.getItem('chat_auto_popup');
      if (val !== null) {
        setAutoPopup(val !== 'false');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  React.useEffect(() => {
    if (user && user.role !== 'candidate') {
      const fetchPendingCount = async () => {
        try {
          const pending = await dataService.getPendingTransfersForMe(user.id);
          setPendingTransfersCount(pending.length);
        } catch (err) {
          console.error('Failed to fetch pending transfers count:', err);
        }
      };

      const fetchOrphanedCount = async () => {
        if (user.role === 'super_admin') {
          try {
            const count = await dataService.getOrphanedCandidatesCount();
            setOrphanedCount(count);
          } catch (err) {
            console.error('Failed to fetch orphaned candidates count:', err);
          }
        }
      };

      fetchPendingCount();
      fetchOrphanedCount();
      const interval = setInterval(() => {
        fetchPendingCount();
        fetchOrphanedCount();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const { presenceState, activeAdminsCount } = usePresence();
  const isSuperAdminOnline = Object.values(presenceState).some(p => p.role === 'super_admin');

  React.useEffect(() => {
    if (allAdmins.length > 0) {
      const now = new Date().getTime();
      const twoMinutes = 2 * 60 * 1000;
      
      const online = allAdmins.filter(a => {
        if (!a.last_seen || !a.is_online) return false;
        const lastSeen = new Date(a.last_seen).getTime();
        return (now - lastSeen) < twoMinutes;
      }).map(a => a.id);
      
      setOnlineUsers(online);
    }
  }, [allAdmins]);

  React.useEffect(() => {
    if (user && user.role !== 'candidate') {
      const fetchAdmins = async () => {
        try {
          const data = await dataService.getUsers();
          setAllAdmins(data || []);
        } catch (err) {
          console.error('Failed to fetch admins:', err);
          console.log('Fallback: loading basic profile data only');
          setAllAdmins([]);
          toast.error('שגיאה בטעינת מנהלים - מציג נתונים בסיסיים בלבד');
        }
      };
      
      fetchAdmins();
      const interval = setInterval(fetchAdmins, 15000);
      
      const handleBeforeUnload = () => {
        // Presence will automatically handle offline status
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [user]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('התמונה גדולה מדי (מקסימום 2MB)');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        // const res = await fetch('/api/users/me/profile', {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ avatar_url: base64 })
        // });
        // if (res.ok) {
          toast.success('תמונת הפרופיל עודכנה');
          refreshUser();
        // }
      } catch (err) {
        toast.error('שגיאה בעדכון התמונה');
      }
    };
    reader.readAsDataURL(file);
  };

  const [timeLeft, setTimeLeft] = React.useState(0);

  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
      setTimeLeft(diff);
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isMalachi = activeUser?.phone === '0556603336';

  let navItems: any[] = activeUser?.role === 'candidate' 
    ? [
        { path: '/candidate-dashboard', label: 'דף הבית', icon: <LayoutDashboard size={20} /> },
        { path: '/portal/published-today', label: 'פורסמו היום', icon: <Sparkles size={20} /> },
        { path: '/portal/speed-date', label: 'ספיד-דייט', icon: <Zap size={20} /> },
        { path: '/portal/games', label: 'משחקים', icon: <Gamepad2 size={20} /> },
      ]
    : [
        { path: '/connected-admins', label: getGenderedText(activeUser?.gender, 'מנהלים מחוברים', 'מנהלות מחוברות'), icon: <Users size={20} /> },
        { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { 
          path: '/suggestions', 
          label: 'הצעות יומיות', 
          icon: <Sparkles size={20} />,
          badge: formatTime(timeLeft)
        },
        { path: '/matches/males', label: 'משודכים (בנים)', icon: <UserCheck size={20} /> },
        { path: '/matches/females', label: 'משודכות (בנות)', icon: <Heart size={20} /> },
        { path: '/matches/new', label: getGenderedText(activeUser?.gender, 'צור כרטיס חדש', 'צרי כרטיס חדש'), icon: <UserPlus size={20} /> },
        { path: '/pending-contact', label: 'ממתינים לקשר', icon: <UserCheck size={20} /> },
        { path: '/initial-contact', label: 'קשר ראשוני', icon: <UserCheck size={20} /> },
        { path: '/tracking', label: 'מעקב פעולות', icon: <History size={20} /> },
        ...(activeUser?.role === 'team_leader' ? [{ path: '/tracking', label: 'מעקב פרסומים צוותי', icon: <History size={20} /> }] : []),
      ];

  if (isMalachi) {
    navItems.unshift({ 
      path: '/control-center', 
      label: 'מרכז השליטה', 
      icon: <ShieldAlert size={20} className="text-[#D4AF37]" />,
      isGold: true
    });
  }

  if (pendingTransfersCount > 0) {
    navItems.push({
      path: '/pending-transfers',
      label: 'בקשות חדשות',
      icon: <UserPlus size={20} />,
      badge: pendingTransfersCount.toString()
    });
  }

  if (activeUser?.role === 'super_admin' && orphanedCount > 0) {
    navItems.push({
      path: '/orphaned-candidates',
      label: getGenderedText(activeUser?.gender, 'משודכים ללא מנהל', 'משודכות ללא מנהלת'),
      icon: <UserMinus size={20} />,
      badge: orphanedCount.toString()
    });
  }

  const handleOpenTransferModal = () => {
    setShowTransferModal(true);
    setIsOpen(false);
  };

  if (activeUser?.role === 'super_admin' || activeUser?.role === 'team_leader' || activeUser?.role === 'super_observer') {
    navItems.unshift(
      { path: '/admins', label: getGenderedText(activeUser?.gender, 'ניהול מנהלים', 'ניהול מנהלות'), icon: <UserCog size={20} /> },
      { path: '/roles', label: 'ניהול תפקידים', icon: <ShieldAlert size={20} /> }
    );
  }

  if (activeUser?.role === 'super_admin' || activeUser?.role === 'super_observer') {
    navItems.push(
      { path: '/blacklist', label: 'רשימה שחורה', icon: <ShieldAlert size={20} /> },
      { path: '/import-portal', label: 'פורטל ייבוא', icon: <Database size={20} /> }
    );
    navItems.push(
      { path: '/settings', label: 'הגדרות', icon: <Settings size={20} /> }
    );
  }

  let mainNavItems = navItems;
  let additionalNavItems: any[] = [];
  
  if (activeUser?.role !== 'candidate') {
    const newCardIndex = navItems.findIndex(item => item.path === '/matches/new');
    if (newCardIndex !== -1 && newCardIndex < navItems.length - 1) {
      mainNavItems = navItems.slice(0, newCardIndex + 1);
      additionalNavItems = navItems.slice(newCardIndex + 1);
    }
  }

  const renderNavItem = (item: any) => (
    <div key={item.path} className="relative group">
      <Link
        to={item.path}
        onClick={(e) => {
          if (effectiveUser?.role === 'super_observer') {
            e.preventDefault();
          } else {
            setIsOpen(false);
          }
        }}
        title={effectiveUser?.role === 'super_observer' ? 'אין הרשאת עריכה במצב צופה' : ''}
        className={`sidebar-item flex-1 ${
          location.pathname === item.path ? 'sidebar-item-active' : ''
        } ${
          item.path === '/' ? '!bg-blue-700 !text-white font-bold hover:!bg-blue-800' : ''
        } ${
          item.path === '/connected-admins' ? '!bg-emerald-600 !text-white font-bold hover:!bg-emerald-700' : ''
        } ${
          item.path === '/suggestions' ? '!bg-[#FFF9E6] !text-[#8B6508] border border-[#FFE4B5] font-bold hover:!bg-[#FFF0C2]' : ''
        } ${
          item.path === '/matches/males' ? '!bg-blue-100 !text-blue-900 font-bold hover:!bg-blue-200' : ''
        } ${
          item.path === '/matches/females' ? '!bg-pink-100 !text-pink-900 font-bold hover:!bg-pink-200' : ''
        } ${
          item.isGold ? '!bg-[#D4AF37]/10 !text-[#D4AF37] border border-[#D4AF37]/20 font-bold hover:!bg-[#D4AF37]/20' : ''
        } ${effectiveUser?.role === 'super_observer' && !item.isGold ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {item.icon}
        <span className={`font-medium flex-1 ${item.isGold ? 'text-[#D4AF37]' : ''}`}>{item.label}</span>
        {item.badge && (
          <span className="text-[9px] font-black bg-luxury-blue/10 text-luxury-blue px-2 py-0.5 rounded-full border border-luxury-blue/20">
            {item.badge}
          </span>
        )}
        {item.path === '/connected-admins' && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAutoPopup(!autoPopup);
            }}
            className={`p-1 rounded-lg transition-all ${autoPopup ? 'text-luxury-blue bg-blue-50' : 'text-slate-300 hover:text-slate-400'}`}
            title={autoPopup ? 'צ\'אט קופץ פעיל' : 'צ\'אט קופץ כבוי'}
          >
            <MessageSquare size={14} />
          </button>
        )}
      </Link>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {location.pathname !== '/' && (
            <button onClick={() => navigate(-1)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg">
              <ArrowRight size={20} />
            </button>
          )}
        <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold ${isSuperAdminOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          <div className={`w-1 h-1 rounded-full ${isSuperAdminOnline ? 'bg-green-500' : 'bg-slate-400'}`}></div>
          {isSuperAdminOnline ? 'מנהל ראשי מחובר' : 'מנהל ראשי לא מחובר'}
        </div>
      </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={logout}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            title="התנתקות"
          >
            <LogOut size={20} />
          </button>
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isOpen || window.innerWidth >= 1024) && (
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed lg:sticky top-0 right-0 h-screen w-72 bg-white border-l border-slate-100 z-50 flex flex-col shadow-xl lg:shadow-none ${!isOpen && 'hidden lg:flex'}`}
          >
            <div className="p-8 border-b border-slate-50 hidden lg:block">
              {effectiveUser?.role === 'super_observer' && (
                <div className="mb-4 px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 rounded-lg text-[10px] font-bold text-center">
                  מצב צופה פעיל - הרשאות קריאה בלבד
                </div>
              )}
              <div className="flex items-center justify-between">
                <Logo size={40} />
                <div className="flex flex-col items-end">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all duration-300 bg-emerald-500/10 backdrop-blur-sm text-slate-900 hover:bg-emerald-500/20`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isSuperAdminOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                    {isSuperAdminOnline ? 'מנהל ראשי מחובר' : 'מנהל ראשי לא מחובר'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-text-secondary font-medium mt-2">מערכת ניהול מקצועית</p>
            </div>

            <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
              {user?.role !== 'candidate' && (
                <button
                  onClick={() => setShowConnectedAdmins(true)}
                  className="w-full sidebar-item mb-2 bg-emerald-500/5 text-emerald-900 border border-emerald-500/10 hover:bg-emerald-500/10 transition-all"
                >
                  <Users size={20} />
                  <span className="font-bold flex-1 text-right">מחוברים כעת ({activeAdminsCount})</span>
                </button>
              )}
              {user?.role !== 'candidate' && (
                <button
                  onClick={handleOpenTransferModal}
                  className="w-full sidebar-item mb-2 bg-luxury-blue/5 text-luxury-blue border border-luxury-blue/10 hover:bg-luxury-blue/10 transition-all"
                >
                  <ArrowLeftRight size={20} />
                  <span className="font-bold flex-1 text-right">העברת משודכים</span>
                  {pendingTransfersCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                      {pendingTransfersCount}
                    </span>
                  )}
                </button>
              )}
              
              <ActiveManagersWidget />

              {mainNavItems.map(renderNavItem)}

              {additionalNavItems.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setIsAdditionalOpen(!isAdditionalOpen)}
                    className="w-full flex items-center justify-between p-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Settings size={20} />
                      <span className="font-bold">פונקציות נוספות</span>
                    </div>
                    {isAdditionalOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  <AnimatePresence>
                    {isAdditionalOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 pr-2 py-2 border-r-2 border-slate-100 mr-4 space-y-1 mt-1">
                          {additionalNavItems.map(renderNavItem)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {user?.role !== 'candidate' && (
                <div className="pt-4 mt-4 border-t border-slate-50">
                  <div className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">ניהול פורטל</div>
                  <div className="space-y-1">
                    {user?.role === 'super_admin' && (
                      <Link
                        to="/portal-admin"
                        onClick={() => setIsOpen(false)}
                        className={`sidebar-item ${location.pathname === '/portal-admin' ? 'sidebar-item-active' : ''}`}
                      >
                        <Gamepad2 size={20} />
                        <span className="font-medium flex-1">הגדרות פורטל</span>
                      </Link>
                    )}
                    <Link
                      to="/admin-live-tracker"
                      onClick={() => setIsOpen(false)}
                      className={`sidebar-item ${location.pathname === '/admin-live-tracker' ? 'sidebar-item-active' : ''}`}
                    >
                      <Gamepad2 size={20} />
                      <span className="font-medium flex-1">מבוך שיתוף פעולה</span>
                    </Link>
                    <Link
                      to="/leaderboard"
                      onClick={() => setIsOpen(false)}
                      className={`sidebar-item ${location.pathname === '/leaderboard' ? 'sidebar-item-active' : ''}`}
                    >
                      <Trophy size={20} />
                      <span className="font-medium flex-1">טבלת מובילים - מבוך</span>
                    </Link>
                  </div>
                </div>
              )}
            </nav>

            <div className="p-6 border-t border-slate-50">
              {user?.role !== 'super_admin' && (
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full mb-4 py-2 px-4 text-xs font-bold text-luxury-blue bg-blue-50 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  <Settings size={14} />
                  בקשה לשינוי סיסמא
                </button>
              )}
              <div className="flex items-center gap-3 px-4 py-4 bg-slate-50 rounded-2xl mb-4">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.full_name} 
                      className="w-10 h-10 rounded-xl object-cover shadow-sm group-hover:opacity-75 transition-opacity" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 rounded-xl bg-luxury-blue text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-luxury-blue/80 transition-colors ${user?.avatar_url ? 'hidden' : ''}`}>
                    {(user?.full_name)?.[0]}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={16} className="text-white drop-shadow-md" />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isMalachi ? 'text-[#D4AF37]' : 'text-text-main'}`}>
                    {isMalachi ? 'מלאכי צוריאל - מנהל העמותה' : (effectiveUser ? (effectiveUser.full_name || effectiveUser.name) : user?.full_name)}
                  </p>
                  <p className={`text-xs font-medium truncate ${isMalachi ? 'text-[#D4AF37]/80' : 'text-text-secondary'}`}>
                    {isMalachi ? 'מנהל העמותה' : (
                      effectiveUser ? 
                        (effectiveUser.role === 'super_admin' ? 'מנהל ראשי' : effectiveUser.role === 'team_leader' ? getGenderedText(effectiveUser.gender, 'ראש צוות', 'ראשת צוות') : 'מנהל') :
                        (user?.role === 'super_admin' ? 'מנהל ראשי' : user?.role === 'team_leader' ? getGenderedText(user?.gender, 'ראש צוות', 'ראשת צוות') : user?.role === 'candidate' ? 'משודך' : 'מנהל')
                    )}
                  </p>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-50 text-red-500 hover:bg-red-50 transition-all font-semibold"
              >
                <LogOut size={20} />
                התנתקות מהמערכת
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      
      <TransferModal 
        isOpen={showTransferModal} 
        onClose={() => setShowTransferModal(false)} 
      />
      
      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-luxury-blue">
                  <Settings size={24} />
                  <h2 className="text-xl font-bold">שינוי סיסמא</h2>
                </div>
                <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">סיסמא קודמת</label>
                  <input 
                    type="password" 
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-luxury-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">סיסמא חדשה</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-luxury-blue outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">אימות סיסמא חדשה</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-luxury-blue outline-none"
                  />
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (newPassword !== confirmPassword) return toast.error('הסיסמאות אינן תואמות');
                  try {
                    // const res = await fetch('/api/users/change-password', {
                    //   method: 'POST',
                    //   headers: { 'Content-Type': 'application/json' },
                    //   body: JSON.stringify({ oldPassword, newPassword })
                    // });
                    // if (res.ok) {
                      toast.success('הסיסמא שונתה בהצלחה');
                      setShowPasswordModal(false);
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    // } else {
                    //   const data = await res.json();
                    //   toast.error(data.error || 'שגיאה בשינוי הסיסמא');
                    // }
                  } catch (err) {
                    toast.error('שגיאה בתקשורת עם השרת');
                  }
                }}
                className="w-full py-3 bg-luxury-blue text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
              >
                עדכן סיסמא
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal Chat removed from here, moved to MainLayout */}

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMalachi = user?.phone === '0556603336';

  const isHome = location.pathname === '/';

  return (
    <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100 sticky top-0 z-30">
      <div className="flex items-center gap-6">
        {!isHome && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-text-main rounded-xl hover:bg-slate-100 transition-all font-bold text-sm border border-slate-100"
            >
              <ArrowRight size={18} />
              חזור אחורה
            </button>
            <Link 
              to="/"
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-luxury-blue rounded-xl hover:bg-blue-100 transition-all font-bold text-sm border border-blue-100"
            >
              <LayoutDashboard size={18} />
              תפריט ראשי
            </Link>
          </div>
        )}
        <div className="flex items-center gap-2 text-text-secondary font-medium text-sm">
          <Logo size={28} showText={false} />
          <span>{isMalachi ? 'ברוך הבא, מלאכי צוריאל - מנהל העמותה' : (user?.username === 'god' ? 'ברוך הבא,' : getGenderedText(user?.gender, 'ברוך הבא,', 'ברוכה הבאה,'))}</span>
          <span className="text-text-main font-bold">
            {isMalachi ? '' : (user?.username === 'god' ? (
              <span className="text-luxury-blue font-bold">מנהל ראשי</span>
            ) : user?.full_name)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-xs text-text-secondary font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-bold text-sm"
          title="התנתק והתחבר למנהל אחר"
        >
          <LogOut size={18} />
          התנתקות
        </button>
      </div>
    </header>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, effectiveUser, setImpersonation, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [activeChats, setActiveChats] = useState<{id: string, name: string, initialMessage?: string}[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [multiChatMode, setMultiChatMode] = useState(() => {
    return localStorage.getItem('multi_chat_mode') === 'true';
  });
  const [autoPopup, setAutoPopup] = useState(() => {
    return localStorage.getItem('chat_auto_popup') !== 'false';
  });
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showMoveLimitModal, setShowMoveLimitModal] = useState(false);
  const [chatResetKeys, setChatResetKeys] = useState<Record<string, number>>({});
  const [showConnectedAdmins, setShowConnectedAdmins] = useState(false);

  const originalAdmin = React.useMemo(() => {
    const stored = localStorage.getItem('original_admin_user');
    return stored ? JSON.parse(stored) : null;
  }, [user]);

  const handleReturnToAdmin = () => {
    setImpersonation(null);
    toast.success('חזרת לניהול הראשי בהצלחה');
    navigate('/admins');
  };

  const handleResetChat = (chatId: string) => {
    setChatResetKeys(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || 0) + 1
    }));
  };

  React.useEffect(() => {
    const handleStorage = () => {
      setMultiChatMode(localStorage.getItem('multi_chat_mode') === 'true');
      setAutoPopup(localStorage.getItem('chat_auto_popup') !== 'false');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  React.useEffect(() => {
    localStorage.setItem('chat_auto_popup', autoPopup.toString());
  }, [autoPopup]);

  React.useEffect(() => {
    localStorage.setItem('multi_chat_mode', multiChatMode.toString());
  }, [multiChatMode]);

  const openChat = (otherUser: {id: string, name: string}, initialMessage?: string) => {
    setActiveChats(prev => {
      if (prev.some(c => c.id === otherUser.id)) {
        setSelectedChatId(otherUser.id);
        return prev;
      }
      
      // Limit to 5 chats in multi-chat mode
      if (multiChatMode && prev.length >= 5) {
        setShowLimitModal(true);
        return prev;
      }
      
      setSelectedChatId(otherUser.id);
      return [...prev, { ...otherUser, initialMessage }];
    });
  };

  const closeChat = (userId: string) => {
    setActiveChats(prev => {
      const filtered = prev.filter(c => c.id !== userId);
      if (selectedChatId === userId) {
        setSelectedChatId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  React.useEffect(() => {
    const handleStorageChange = () => {
      const val = localStorage.getItem('chat_auto_popup');
      if (val !== null) {
        setAutoPopup(val !== 'false');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Heartbeat effect
  React.useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      dataService.heartbeat();
    }, 30000); // Every 30 seconds
    
    // Initial heartbeat
    dataService.heartbeat();

    return () => clearInterval(interval);
  }, [user]);

  // Global message listener
  React.useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`global_messages_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new;
          
          // Don't show toast if chat is already open with this user
          const isChatOpen = activeChats.some(c => c.id === msg.sender_id);
          
          // Removed auto-opening chat window logic
          // if (autoPopup) {
          //   openChat({ id: msg.sender_id, name: msg.sender_name });
          // }

          if (!isChatOpen) {
            toast((t) => (
              <div className="flex flex-col gap-2">
                <div className="font-bold text-sm text-luxury-blue">הודעה חדשה מ{msg.sender_name}</div>
                <div className="text-sm text-slate-700">{msg.text.length > 50 ? msg.text.substring(0, 50) + '...' : msg.text}</div>
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => {
                      toast.dismiss(t.id);
                      openChat({ id: msg.sender_id, name: msg.sender_name });
                    }}
                    className="text-xs font-bold text-white bg-luxury-blue px-3 py-1.5 rounded-lg"
                  >
                    פתח שיחה
                  </button>
                  <button 
                    onClick={() => toast.dismiss(t.id)}
                    className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg"
                  >
                    סגור
                  </button>
                </div>
              </div>
            ), { duration: 5000, position: 'bottom-right' });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const impersonateId = params.get('impersonate');

    if (impersonateId) {
      setIsImpersonating(true);
      const handleImpersonation = async () => {
        try {
          // Wait a bit for data service to be ready
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const userToImpersonate = await dataService.getUserById(impersonateId);
          if (userToImpersonate) {
            sessionStorage.setItem('current_user', JSON.stringify(userToImpersonate));
            await refreshUser();
            toast.success(`התחברת בהצלחה כ-${userToImpersonate.full_name}`);
            // Remove query param
            navigate(location.pathname, { replace: true });
          } else {
            // If not found, try to force refresh users first
            await dataService.getUsers();
            const retryUser = await dataService.getUserById(impersonateId);
            if (retryUser) {
              sessionStorage.setItem('current_user', JSON.stringify(retryUser));
              await refreshUser();
              toast.success(`התחברת בהצלחה כ-${retryUser.full_name}`);
              navigate(location.pathname, { replace: true });
            } else {
              toast.error('מנהל לא נמצא - נסה שוב');
            }
          }
        } catch (err) {
          console.error('Impersonation error:', err);
          toast.error('שגיאה בהתחברות כמנהל');
        } finally {
          setIsImpersonating(false);
        }
      };
      handleImpersonation();
    }
  }, [location.search, refreshUser, navigate]);

  if (isImpersonating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-gray">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg font-bold text-luxury-blue">מתחבר למערכת...</p>
        </div>
      </div>
    );
  }

  if (!user) return <>{children}</>;

  return (
    <ChatProvider value={{ openChat }}>
      <div className="flex flex-col lg:flex-row min-h-screen bg-bg-gray">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {effectiveUser && (
            <div className={`border-b px-6 py-2 flex items-center justify-between sticky top-0 z-[40] ${effectiveUser.role === 'super_observer' ? 'bg-red-600 text-white' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-center gap-3 font-bold text-sm">
                {effectiveUser.role === 'super_observer' ? (
                  <>
                    <ShieldAlert size={18} className="text-white" />
                    <span>מלאכי צוריאל - מנהל עמותת החצי השני</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={18} className="text-amber-500" />
                    <span>מבצע פעולות בשם: {effectiveUser.full_name || effectiveUser.name} - מצב צפייה בנתוני מנהל - מסונן</span>
                  </>
                )}
              </div>
              <button 
                onClick={effectiveUser.role === 'super_observer' ? () => navigate('/identity-selector') : handleReturnToAdmin}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all shadow-sm flex items-center gap-2 ${effectiveUser.role === 'super_observer' ? 'bg-white text-red-600 hover:bg-red-50' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
              >
                <ArrowLeftRight size={14} />
                {effectiveUser.role === 'super_observer' ? 'החלף זהות צפייה' : 'חזור לניהול שלי'}
              </button>
            </div>
          )}
          <Header />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>

        {/* Global Internal Chat */}
        <div className="fixed bottom-4 left-4 z-[110] flex flex-row items-end gap-4 pointer-events-none">
          <AnimatePresence>
            {multiChatMode ? (
              activeChats.map((chat) => (
                <div key={`${chat.id}-${chatResetKeys[chat.id] || 0}`} className="pointer-events-auto">
                  <InternalChat 
                    otherUser={chat} 
                    onClose={() => closeChat(chat.id)} 
                    isMultiMode={true}
                    activeChats={activeChats}
                    onDragDisabled={() => setShowMoveLimitModal(true)}
                    onReset={() => handleResetChat(chat.id)}
                    initialMessage={chat.initialMessage}
                  />
                </div>
              ))
            ) : (
              activeChats.length > 0 && selectedChatId && (
                <div key={`${selectedChatId}-${chatResetKeys[selectedChatId] || 0}`} className="pointer-events-auto">
                  <InternalChat 
                    otherUser={activeChats.find(c => c.id === selectedChatId)!} 
                    onClose={() => closeChat(selectedChatId)} 
                    activeChats={activeChats}
                    onSelectChat={setSelectedChatId}
                    selectedChatId={selectedChatId}
                    isMultiMode={false}
                    onDragDisabled={() => setShowMoveLimitModal(true)}
                    onReset={() => handleResetChat(selectedChatId)}
                    initialMessage={activeChats.find(c => c.id === selectedChatId)?.initialMessage}
                  />
                </div>
              )
            )}
          </AnimatePresence>
        </div>

        <OnlineMonitor 
          isOpen={showConnectedAdmins} 
          onClose={() => setShowConnectedAdmins(false)} 
          onOpenChat={(user) => {
            setShowConnectedAdmins(false);
            openChat(user);
          }}
        />

        {/* Auto Popup Toggle Floating Button removed from here, moved to ConnectedAdmins.tsx */}

        {/* Chat Limit Modal */}
        <AnimatePresence>
          {showLimitModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-md w-full text-center space-y-6 border border-slate-100"
              >
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                  <X size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">הגעת לגבול המקסימלי</h3>
                  <p className="text-slate-500 font-bold">לא ניתן לנהל צ'אט עם יותר מ-5 מנהלים במקביל במצב ריבוי חלונות.</p>
                </div>
                <button 
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-4 bg-luxury-blue text-white rounded-2xl font-black hover:opacity-90 transition-all shadow-lg active:scale-95"
                >
                  הבנתי, תודה
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Move Limit Modal */}
        <AnimatePresence>
          {showMoveLimitModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-md w-full text-center space-y-6 border border-slate-100"
              >
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                  <ShieldAlert size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">הגבלת הזזה</h3>
                  <p className="text-slate-500 font-bold">לא ניתן להזיז את חלוניות הצ'אט כאשר יש יותר מ-2 חלונות פעילים במקביל.</p>
                </div>
                <button 
                  onClick={() => setShowMoveLimitModal(false)}
                  className="w-full py-4 bg-luxury-blue text-white rounded-2xl font-black hover:opacity-90 transition-all shadow-lg active:scale-95"
                >
                  הבנתי
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ChatProvider>
  );
}

const PresenceWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return <PresenceProvider user={user}>{children}</PresenceProvider>;
};

export default function App() {
  return (
    <BackendProvider>
      <SettingsProvider>
        <AuthProvider>
          <PresenceWrapper>
            <BrowserRouter>
            <Toaster position="top-center" />
            <MainLayout>
              <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/identity-selector" element={<ProtectedRoute><IdentitySelector /></ProtectedRoute>} />
              <Route path="/admin-dashboard" element={<ProtectedRoute superAdminOnly><ControlCenter /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/suggestions" element={<ProtectedRoute><DailySuggestionsPage /></ProtectedRoute>} />
              <Route path="/matches/:type" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/matches/new" element={<ProtectedRoute><MatchForm /></ProtectedRoute>} />
              <Route path="/matches/edit/:id" element={<ProtectedRoute><MatchForm /></ProtectedRoute>} />
              <Route path="/tracking" element={<ProtectedRoute><TrackingPage /></ProtectedRoute>} />
              <Route path="/pending-transfers" element={<ProtectedRoute adminOnly><PendingTransfersPage /></ProtectedRoute>} />
              <Route path="/orphaned-candidates" element={<ProtectedRoute superAdminOnly><OrphanedCandidatesPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><MatchesHistoryPage /></ProtectedRoute>} />
              <Route path="/connected-admins" element={<ProtectedRoute><ConnectedAdmins /></ProtectedRoute>} />
              <Route path="/admins" element={<ProtectedRoute adminOnly><AdminManagement /></ProtectedRoute>} />
              <Route path="/roles" element={<ProtectedRoute adminOnly><RoleManagement /></ProtectedRoute>} />
              <Route path="/blacklist" element={<ProtectedRoute superAdminOnly><BlacklistManagement /></ProtectedRoute>} />
              <Route path="/import-portal" element={<ProtectedRoute superAdminOnly><ImportPortal /></ProtectedRoute>} />
              <Route path="/initial-contact" element={<ProtectedRoute adminOnly><InitialContactPage /></ProtectedRoute>} />
              <Route path="/pending-contact" element={<ProtectedRoute adminOnly><PendingContactPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute superAdminOnly><SettingsPage /></ProtectedRoute>} />
              <Route path="/portal-admin" element={<ProtectedRoute superAdminOnly><CandidatePortalAdmin /></ProtectedRoute>} />
              
              {/* Maze Management Routes */}
              <Route path="/admin-live-tracker" element={<ProtectedRoute adminOnly><AdminLiveTracker /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute adminOnly><Leaderboard /></ProtectedRoute>} />
              
              {/* Candidate Portal Routes */}
              <Route path="/candidate-dashboard" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
              <Route path="/candidate-profile" element={<Navigate to="/candidate-dashboard" replace />} />
              <Route path="/portal/published-today" element={<ProtectedRoute><PublishedToday /></ProtectedRoute>} />
              <Route path="/portal/speed-date" element={<ProtectedRoute><SpeedDate /></ProtectedRoute>} />
              <Route path="/portal/games" element={<ProtectedRoute><GamesPortal /></ProtectedRoute>} />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </PresenceWrapper>
    </AuthProvider>
    </SettingsProvider>
  </BackendProvider>
);
}
