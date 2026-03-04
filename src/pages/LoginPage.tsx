import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { LogIn, User, Lock, Heart, ShieldCheck, Users, Eye, EyeOff, Send, ClipboardList, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME } from '../constants';
import { Logo } from '../components/Logo';

export default function LoginPage() {
  const [loginType, setLoginType] = useState<'selection' | 'super' | 'admin'>('selection');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setGoogleEnabled(data.google_login_enabled !== 'false');
      });

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) return;
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        login(event.data.user);
        toast.success('ברוך הבא!');
        navigate('/');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [login, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data);
        toast.success('ברוך הבא!');
        navigate('/');
      } else {
        toast.error(data.error || 'שגיאה בהתחברות');
      }
    } catch (err) {
      toast.error('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_login', 'width=500,height=600');
    } catch (err) {
      toast.error('שגיאה בהתחברות עם גוגל');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-gray">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center p-6 rounded-3xl bg-white shadow-xl mb-6 border border-slate-100">
            <Logo size={80} showText={false} />
          </div>
          <h1 className="text-4xl font-black text-text-main mb-2">ברוכים הבאים</h1>
          <p className="text-lg text-text-secondary max-w-md mx-auto font-medium leading-relaxed">
            המערכת נועדה לסייע לכם לפרסם כרטיסי משודכים ולהיות במעקב של פרסום בקבוצות המשודכים שלכם
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-luxury-blue flex items-center justify-center shadow-sm">
                <UserCheck size={24} />
              </div>
              <span className="text-xs font-bold text-text-secondary">ניהול משודכים</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center shadow-sm">
                <Send size={24} />
              </div>
              <span className="text-xs font-bold text-text-secondary">שליחת וואטזאפ</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-soft-purple flex items-center justify-center shadow-sm">
                <ClipboardList size={24} />
              </div>
              <span className="text-xs font-bold text-text-secondary">מעקב פירסומים</span>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full">
          <AnimatePresence mode="wait">
            {loginType === 'selection' ? (
              <motion.div 
                key="selection"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 gap-4"
              >
                <button 
                  onClick={() => setLoginType('super')}
                  className="card p-6 flex items-center gap-4 hover:border-luxury-blue transition-all group text-right"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-luxury-blue flex items-center justify-center group-hover:bg-luxury-blue group-hover:text-white transition-all">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">ניהול ראשי</h3>
                    <p className="text-sm text-text-secondary">כניסה עם שם משתמש וסיסמה</p>
                  </div>
                </button>

                <button 
                  onClick={() => setLoginType('admin')}
                  className="card p-6 flex items-center gap-4 hover:border-soft-purple transition-all group text-right"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-soft-purple flex items-center justify-center group-hover:bg-soft-purple group-hover:text-white transition-all">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">כניסת מנהלים</h3>
                    <p className="text-sm text-text-secondary">כניסה מהירה עם גוגל או סיסמה</p>
                  </div>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card p-8 shadow-xl border-none"
              >
                <button 
                  onClick={() => setLoginType('selection')}
                  className="text-sm text-luxury-blue font-bold mb-6 hover:underline flex items-center gap-1"
                >
                  חזרה לבחירה
                </button>

                <h2 className="text-xl font-bold mb-6">
                  {loginType === 'super' ? 'התחברות ניהול ראשי' : 'התחברות מנהלים'}
                </h2>

                {loginType === 'admin' && googleEnabled && (
                  <button 
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 p-3 border border-slate-200 rounded-xl mb-6 hover:bg-slate-50 transition-all font-bold"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    התחברות עם גוגל
                  </button>
                )}

                {loginType === 'admin' && googleEnabled && (
                  <div className="relative flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-slate-100"></div>
                    <span className="text-xs text-slate-400 font-bold uppercase">או</span>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-text-main mb-2">שם משתמש או טלפון</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        className="input-field pr-12"
                        placeholder="הזן שם משתמש או טלפון"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-main mb-2">סיסמה</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="input-field pr-12 pl-12"
                        placeholder="הזן סיסמה"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 hover:text-luxury-blue transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 flex items-center justify-center gap-2 text-lg rounded-xl text-white font-bold transition-all shadow-md active:scale-95 ${
                      loginType === 'super' ? 'bg-luxury-blue hover:bg-blue-700' : 'bg-soft-purple hover:bg-purple-700'
                    }`}
                  >
                    {loading ? 'מתחבר...' : (
                      <>
                        <LogIn size={20} />
                        התחברות
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <p className="text-center text-slate-400 text-sm mt-10 font-medium">
          &copy; 2026 {APP_NAME}
        </p>
      </motion.div>
    </div>
  );
}
