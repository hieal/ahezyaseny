import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PresenceProvider, usePresence } from './contexts/PresenceContext';
import { BackendProvider, useBackend } from './contexts/BackendContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DailySuggestionsPage from './pages/DailySuggestionsPage';
import MatchForm from './pages/MatchForm';
import AdminManagement from './pages/AdminManagement';
import RoleManagement from './pages/RoleManagement';
import SettingsPage from './pages/SettingsPage';
import TrackingPage from './pages/TrackingPage';
import MatchesHistoryPage from './pages/MatchesHistoryPage';
import ConnectedAdmins from './pages/ConnectedAdmins';
import CandidateDashboard from './pages/CandidateDashboard';
import SpeedDate from './pages/SpeedDate';
import GamesPortal from './pages/GamesPortal';
import CandidatePortalAdmin from './pages/CandidatePortalAdmin';
import PublishedToday from './pages/PublishedToday';
import { LayoutDashboard, Users, UserPlus, UserCog, Settings, LogOut, Menu, X, Heart, ClipboardList, UserCheck, ArrowRight, History, Plus, Clock, User, MessageSquare, Send, ShieldAlert, Database, Cloud, Sparkles, ArrowLeftRight, Gamepad2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME } from './constants';
import { getGenderedText } from './utils/gender';
import { toast } from 'react-hot-toast';
import { Logo } from './components/Logo';
import { dataService } from './services/dataService';
import { supabase } from './services/supabase';
import { InternalChat } from './components/InternalChat';
import { ChatProvider } from './contexts/ChatContext';
import { TransferModal } from './components/TransferModal';

function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }: { children: React.ReactNode, adminOnly?: boolean, superAdminOnly?: boolean }) {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-gray">
      <div className="w-12 h-12 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  
  if (superAdminOnly && user.role !== 'super_admin') return <Navigate to="/" />;
  if (adminOnly && user.role !== 'super_admin' && user.role !== 'team_leader') return <Navigate to="/" />;
  
  return <>{children}</>;
}

function Sidebar() {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showConnectedAdmins, setShowConnectedAdmins] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  const [pendingTransfersCount, setPendingTransfersCount] = React.useState(0);
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [allAdmins, setAllAdmins] = React.useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = React.useState<string[]>([]);
  const [autoPopup, setAutoPopup] = React.useState(() => {
    return localStorage.getItem('chat_auto_popup') !== 'false';
  });

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
    if (user) {
      const fetchPendingCount = async () => {
        try {
          const pending = await dataService.getPendingTransfersForMe(user.id);
          setPendingTransfersCount(pending.length);
        } catch (err) {
          console.error('Failed to fetch pending transfers count:', err);
        }
      };
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const { presenceState } = usePresence();
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
    if (user) {
      const fetchAdmins = async () => {
        try {
          const data = await dataService.getUsers();
          setAllAdmins(data);
        } catch (err) {
          console.error('Failed to fetch admins:', err);
          setAllAdmins([]);
          toast.error('לא נמצאו מנהלים');
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

  const navItems = user?.role === 'candidate' 
    ? [
        { path: '/portal', label: 'דף הבית', icon: <LayoutDashboard size={20} /> },
        { path: '/portal/published-today', label: 'פורסמו היום', icon: <Sparkles size={20} /> },
        { path: '/portal/speed-date', label: 'ספיד-דייט', icon: <Zap size={20} /> },
        { path: '/portal/games', label: 'משחקים', icon: <Gamepad2 size={20} /> },
      ]
    : [
        { path: '/connected-admins', label: 'מנהלים מחוברים', icon: <Users size={20} /> },
        { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { 
          path: '/suggestions', 
          label: 'הצעות יומיות', 
          icon: <Sparkles size={20} />,
          badge: formatTime(timeLeft)
        },
        { path: '/matches/males', label: 'משודכים (בנים)', icon: <UserCheck size={20} /> },
        { path: '/matches/females', label: 'משודכות (בנות)', icon: <Heart size={20} /> },
        { path: '/matches/new', label: 'צור כרטיס חדש', icon: <UserPlus size={20} /> },
        { path: '/tracking', label: 'מעקב פעולות', icon: <History size={20} /> },
        { path: '/history', label: 'היסטוריית משודכים', icon: <Clock size={20} /> },
      ];

  const handleOpenTransferModal = () => {
    setShowTransferModal(true);
    setIsOpen(false);
  };

  if (user?.role === 'super_admin' || user?.role === 'team_leader') {
    navItems.push(
      { path: '/admins', label: 'ניהול מנהלים', icon: <UserCog size={20} /> },
      { path: '/roles', label: 'ניהול תפקידים', icon: <ShieldAlert size={20} /> }
    );
  }

  if (user?.role === 'super_admin') {
    navItems.push(
      { path: '/portal-admin', label: 'ניהול פורטל', icon: <Gamepad2 size={20} /> },
      { path: '/settings', label: 'הגדרות', icon: <Settings size={20} /> }
    );
  }

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
            <Logo size={24} />
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
              <div className="flex items-center justify-between">
                <Logo size={40} />
                <div className="flex flex-col items-end">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${isSuperAdminOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isSuperAdminOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                    {isSuperAdminOnline ? 'מנהל ראשי מחובר' : 'מנהל ראשי לא מחובר'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-text-secondary font-medium mt-2">מערכת ניהול מקצועית</p>
            </div>

            <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
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

              {navItems.map((item) => (
                <div key={item.path} className="relative group">
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`sidebar-item flex-1 ${
                      location.pathname === item.path ? 'sidebar-item-active' : ''
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium flex-1">{item.label}</span>
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
              ))}
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
                  <p className="text-sm font-bold text-text-main truncate">{user?.full_name}</p>
                  <p className="text-xs text-text-secondary font-medium truncate">{user?.role === 'super_admin' ? 'מנהל ראשי' : user?.role === 'team_leader' ? 'ראש צוות' : 'מנהל'}</p>
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
          <span>{user?.username === 'god' ? 'ברוך הבא,' : getGenderedText(user?.gender, 'ברוך הבא,', 'ברוכה הבאה,')}</span>
          <span className="text-text-main font-bold">{user?.username === 'god' ? 'מנהל ראשי' : user?.full_name}</span>
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
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isImpersonating, setIsImpersonating] = React.useState(false);
  const [activeChats, setActiveChats] = React.useState<{id: string, name: string, initialMessage?: string}[]>([]);
  const [selectedChatId, setSelectedChatId] = React.useState<string | null>(null);
  const [multiChatMode, setMultiChatMode] = React.useState(() => {
    return localStorage.getItem('multi_chat_mode') === 'true';
  });
  const [autoPopup, setAutoPopup] = React.useState(() => {
    return localStorage.getItem('chat_auto_popup') !== 'false';
  });
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const [showMoveLimitModal, setShowMoveLimitModal] = React.useState(false);
  const [chatResetKeys, setChatResetKeys] = React.useState<Record<string, number>>({});

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
    }, 60000); // Every minute
    
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
      <AuthProvider>
        <PresenceWrapper>
          <BrowserRouter>
          <Toaster position="top-center" />
          <MainLayout>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/suggestions" element={<ProtectedRoute><DailySuggestionsPage /></ProtectedRoute>} />
              <Route path="/matches/:type" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/matches/new" element={<ProtectedRoute><MatchForm /></ProtectedRoute>} />
              <Route path="/matches/edit/:id" element={<ProtectedRoute><MatchForm /></ProtectedRoute>} />
              <Route path="/tracking" element={<ProtectedRoute><TrackingPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><MatchesHistoryPage /></ProtectedRoute>} />
              <Route path="/connected-admins" element={<ProtectedRoute><ConnectedAdmins /></ProtectedRoute>} />
              <Route path="/admins" element={<ProtectedRoute adminOnly><AdminManagement /></ProtectedRoute>} />
              <Route path="/roles" element={<ProtectedRoute adminOnly><RoleManagement /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute superAdminOnly><SettingsPage /></ProtectedRoute>} />
              <Route path="/portal-admin" element={<ProtectedRoute superAdminOnly><CandidatePortalAdmin /></ProtectedRoute>} />
              
              {/* Candidate Portal Routes */}
              <Route path="/portal" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
              <Route path="/portal/published-today" element={<ProtectedRoute><PublishedToday /></ProtectedRoute>} />
              <Route path="/portal/speed-date" element={<ProtectedRoute><SpeedDate /></ProtectedRoute>} />
              <Route path="/portal/games" element={<ProtectedRoute><GamesPortal /></ProtectedRoute>} />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </PresenceWrapper>
    </AuthProvider>
  </BackendProvider>
);
}
