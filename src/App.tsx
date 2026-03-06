import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import MatchForm from './pages/MatchForm';
import AdminManagement from './pages/AdminManagement';
import RoleManagement from './pages/RoleManagement';
import SettingsPage from './pages/SettingsPage';
import TrackingPage from './pages/TrackingPage';
import MatchesHistoryPage from './pages/MatchesHistoryPage';
import { LayoutDashboard, Users, UserPlus, UserCog, Settings, LogOut, Menu, X, Heart, ClipboardList, UserCheck, ArrowRight, History, Plus, Clock, User, MessageSquare, Send, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME } from './constants';
import { toast } from 'react-hot-toast';
import { Logo } from './components/Logo';
import ConnectivityMonitor from './components/ConnectivityMonitor';
import { supabase } from './lib/supabase';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'super_admin') return <Navigate to="/" />;
  
  return <>{children}</>;
}

function Sidebar() {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showConnectedAdmins, setShowConnectedAdmins] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [onlineUsers, setOnlineUsers] = React.useState<string[]>([]);
  const [allAdmins, setAllAdmins] = React.useState<any[]>([]);
  const [showChat, setShowChat] = React.useState<any>(null); // { id, name }

  React.useEffect(() => {
    if (user) {
      const fetchAdmins = async () => {
        try {
          const { data, error } = await supabase
            .from("admins")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

          if (!error && data) {
            setAllAdmins(data);
          }
        } catch (err) {
          console.error('Failed to fetch admins:', err);
        }
      };
      fetchAdmins();

      // Supabase Presence for online users
      const channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: user.id.toString(),
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          setOnlineUsers(Object.keys(newState));
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('join', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('leave', key, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ online_at: new Date().toISOString() });
          }
        });

      // Notifications subscription
      const notifChannel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            toast(payload.new.text, { icon: '🔔' });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(notifChannel);
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
        const { error } = await supabase
          .from('admins')
          .update({ avatar_url: base64 })
          .eq('id', user?.id);

        if (!error) {
          toast.success('תמונת הפרופיל עודכנה');
          refreshUser();
        } else {
          toast.error(error.message);
        }
      } catch (err) {
        toast.error('שגיאה בעדכון התמונה');
      }
    };
    reader.readAsDataURL(file);
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/matches/males', label: 'משודכים (בנים)', icon: <UserCheck size={20} /> },
    { path: '/matches/females', label: 'משודכות (בנות)', icon: <Heart size={20} /> },
    { path: '/matches/new', label: 'צור כרטיס חדש', icon: <UserPlus size={20} /> },
    { path: '/tracking', label: 'מעקב פעולות', icon: <History size={20} /> },
    { path: '/history', label: 'היסטוריית משודכים', icon: <Clock size={20} /> },
  ];

  if (user?.role === 'super_admin' || user?.role === 'team_leader') {
    navItems.push(
      { path: '/admins', label: 'ניהול מנהלים', icon: <UserCog size={20} /> },
      { path: '/roles', label: 'ניהול תפקידים', icon: <ShieldAlert size={20} /> }
    );
  }

  if (user?.role === 'super_admin') {
    navItems.push(
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
              <Logo size={40} />
              <p className="text-xs text-text-secondary font-medium mt-2">מערכת ניהול מקצועית</p>
            </div>

            <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`sidebar-item ${
                    location.pathname === item.path ? 'sidebar-item-active' : ''
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              
              <button
                onClick={() => setShowConnectedAdmins(true)}
                className="sidebar-item w-full text-right"
              >
                <Users size={20} />
                <span className="font-medium">מנהלים מחוברים</span>
              </button>
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
                      alt={user.name} 
                      className="w-10 h-10 rounded-xl object-cover shadow-sm group-hover:opacity-75 transition-opacity" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 rounded-xl bg-luxury-blue text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-luxury-blue/80 transition-colors ${user?.avatar_url ? 'hidden' : ''}`}>
                    {(user?.name || user?.username)?.[0]?.toUpperCase()}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={16} className="text-white drop-shadow-md" />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-main truncate">{user?.name || user?.username}</p>
                  <p className="text-xs text-text-secondary font-medium truncate">{user?.role === 'super_admin' ? 'מנהל ראשי' : 'מנהל'}</p>
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
      
      {/* Connected Admins Modal */}
      <AnimatePresence>
        {showConnectedAdmins && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-luxury-blue">
                  <Users size={24} />
                  <h2 className="text-xl font-bold">מנהלים מחוברים</h2>
                </div>
                <button onClick={() => setShowConnectedAdmins(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                  <p className="text-[10px] text-blue-600 font-black uppercase tracking-wider mb-1">בנים מחוברים</p>
                  <p className="text-3xl font-black text-blue-900">
                    {allAdmins.filter(a => onlineUsers.includes(a.id.toString()) && a.gender === 'male').length}
                  </p>
                </div>
                <div className="bg-pink-50 p-4 rounded-2xl text-center border border-pink-100">
                  <p className="text-[10px] text-pink-600 font-black uppercase tracking-wider mb-1">בנות מחוברות</p>
                  <p className="text-3xl font-black text-pink-900">
                    {allAdmins.filter(a => onlineUsers.includes(a.id.toString()) && a.gender === 'female').length}
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {allAdmins.filter(a => onlineUsers.includes(a.id.toString()) && a.id !== user?.id).map(admin => (
                  <div key={admin.id} className="flex flex-col p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {admin.avatar_url ? (
                            <img src={admin.avatar_url} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                              <User size={20} />
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{admin.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-medium">{admin.category || 'כללי'}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${admin.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'}`}></span>
                            <span className="text-[9px] text-slate-400 uppercase font-bold">
                              {admin.role === 'super_admin' ? 'מנהל ראשי' : 
                               admin.role === 'team_leader' ? 'ראש צוות' :
                               admin.role === 'viewer' ? 'צופה' : 'מנהל'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {admin.phone && (
                          <a 
                            href={`https://wa.me/${admin.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all"
                          >
                            <MessageSquare size={16} />
                          </a>
                        )}
                        <button 
                          onClick={() => {
                            setShowChat({ id: admin.id, name: admin.name });
                            setShowConnectedAdmins(false);
                          }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                    {admin.category && (
                      <div className="text-[9px] text-slate-400 font-medium px-1">
                        מנהל את: <span className="text-luxury-blue">{admin.category}</span>
                        {admin.secondary_category && <span>, {admin.secondary_category}</span>}
                      </div>
                    )}
                  </div>
                ))}
                {allAdmins.filter(a => onlineUsers.includes(a.id.toString()) && a.id !== user?.id).length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">אין מנהלים אחרים מחוברים כרגע</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    const { data: userToUpdate } = await supabase
                      .from('admins')
                      .select('password_plain')
                      .eq('id', user?.id)
                      .single();

                    if (userToUpdate?.password_plain !== oldPassword) {
                      return toast.error('סיסמה ישנה שגויה');
                    }

                    const { error } = await supabase
                      .from('admins')
                      .update({ 
                        password_plain: newPassword,
                        password_updated_at: new Date().toISOString()
                      })
                      .eq('id', user?.id);

                    if (!error) {
                      toast.success('הסיסמא שונתה בהצלחה');
                      setShowPasswordModal(false);
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    } else {
                      toast.error(error.message);
                    }
                  } catch (err) {
                    toast.error('שגיאה בתקשורת');
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
          <span>ברוך הבא,</span>
          <span className="text-text-main font-bold">{user?.name || user?.username}</span>
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
  const { user } = useAuth();
  if (!user) return <>{children}</>;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-bg-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" />
        <MainLayout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/matches/:type" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/matches/new" element={<ProtectedRoute><MatchForm /></ProtectedRoute>} />
            <Route path="/matches/edit/:id" element={<ProtectedRoute><MatchForm /></ProtectedRoute>} />
            <Route path="/tracking" element={<ProtectedRoute><TrackingPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><MatchesHistoryPage /></ProtectedRoute>} />
            <Route path="/admins" element={<ProtectedRoute adminOnly><AdminManagement /></ProtectedRoute>} />
            <Route path="/roles" element={<ProtectedRoute><RoleManagement /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </MainLayout>
        <ConnectivityMonitor />
      </BrowserRouter>
    </AuthProvider>
  );
}
