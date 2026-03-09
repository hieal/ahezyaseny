import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackend } from '../contexts/BackendContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { LogIn, User, Lock, Heart, ShieldCheck, Users, Eye, EyeOff, Send, ClipboardList, UserCheck, Database, Cloud, Settings, RefreshCw, Copy, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME } from '../constants';
import { Logo } from '../components/Logo';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { createClient } from '@supabase/supabase-js';

export default function LoginPage() {
  const { mode, setMode } = useBackend();
  const [loginType, setLoginType] = useState<'selection' | 'super' | 'admin'>('selection');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const hasEnvVars = !!(envUrl && envKey && envUrl !== 'YOUR_SUPABASE_URL');

  const [customUrl, setCustomUrl] = useState(localStorage.getItem('supabase_url') || (hasEnvVars ? envUrl : ''));
  const [customKey, setCustomKey] = useState(localStorage.getItem('supabase_key') || (hasEnvVars ? envKey : ''));
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlScript, setSqlScript] = useState('');
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [quickConnectText, setQuickConnectText] = useState('');
  
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-gray">
        <div className="w-12 h-12 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleSaveKeys = () => {
    if (customUrl) localStorage.setItem('supabase_url', customUrl);
    else localStorage.removeItem('supabase_url');

    if (customKey) localStorage.setItem('supabase_key', customKey);
    else localStorage.removeItem('supabase_key');

    toast.success('מפתחות נשמרו! מרענן...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleQuickConnect = async () => {
    const urlMatch = quickConnectText.match(/https:\/\/[a-z0-9-]+\.supabase\.co/);
    const keyMatch = quickConnectText.match(/eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/);

    if (urlMatch && keyMatch) {
      const url = urlMatch[0];
      const key = keyMatch[0];

      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_key', key);
      setCustomUrl(url);
      setCustomKey(key);
      
      toast.success('מפתחות זוהו ונשמרו! בודק חיבור...');
      setLoading(true);

      try {
        const tempClient = createClient(url, key);
        const { error } = await tempClient.from('admins').select('id').limit(1);

        if (!error) {
          toast.success('חיבור תקין! מרענן...');
          setMode('production');
          localStorage.setItem('backend_mode', 'production');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          // Check if error is related to missing table (Postgres code 42P01 or message)
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            toast.success('המבנה מוכן לסנכרון! אנא לחץ על כפתור הסנכרון.');
            setShowQuickConnect(false);
          } else {
            toast.error('שגיאה בחיבור: ' + error.message);
          }
        }
      } catch (err: any) {
        console.error(err);
        toast.error('שגיאה בבדיקת החיבור: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    } else {
      toast.error('לא נמצאו URL או Key תקינים בטקסט');
    }
  };

  const handleSyncSchema = async () => {
    setLoading(true);
    try {
      // Attempt automatic sync first
      const syncResult = await dataService.syncSchema();
      
      if (syncResult.success) {
        toast.success(syncResult.message);
        setMode('production');
        localStorage.setItem('backend_mode', 'production');
        setTimeout(() => window.location.reload(), 1000);
        return;
      }

      // If auto-sync fails, check connection and tables to show manual SQL if needed
      const { error: adminsError } = await supabase.from('admins').select('id, phone').limit(1);
      const { error: matchesError } = await supabase.from('candidates').select('id, full_name').limit(1);

      if (!adminsError && !matchesError) {
        toast.success('חיבור תקין ומבנה נתונים מאומת!');
        setMode('production');
        localStorage.setItem('backend_mode', 'production');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        // Show manual SQL script
        const script = dataService.getSchemaSQL();
        setSqlScript(script);
        setShowSqlModal(true);
        toast.error('חסרות טבלאות במסד הנתונים. אנא הרץ את ה-SQL המצורף ב-Dashboard של Supabase.');
      }
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בבדיקת מסד הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    toast.success('הועתק ללוח!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await dataService.login(username, password);
      if (user) {
        login(user);
        toast.success('ברוך הבא!');
        navigate('/');
      } else {
        toast.error('שגיאה בהתחברות - בדוק שם משתמש וסיסמה');
      }
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בחיבור למסד הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleBypassLogin = async () => {
    setLoading(true);
    try {
      // First check if admins table exists
      const { error: checkError } = await supabase.from('admins').select('id').limit(1);
      
      if (checkError && (checkError.code === '42P01' || checkError.message?.includes('does not exist'))) {
        toast.error('מסד הנתונים אינו מוכן. אנא לחץ על כפתור הסנכרון (Refresh) למטה.');
        setLoading(false);
        return;
      }

      const user = await dataService.login('god', 'good');
      if (user) {
        login(user);
        toast.success('כניסה מהירה בוצעה בהצלחה!');
        navigate('/');
      } else {
        // Fallback to 'good' if 'god' doesn't exist yet
        const fallbackUser = await dataService.login('good', 'good');
        if (fallbackUser) {
          login(fallbackUser);
          toast.success('כניסה מהירה בוצעה בהצלחה!');
          navigate('/');
        } else {
          toast.error('שגיאה בכניסה מהירה');
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error('שגיאה: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
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
          <button 
            onClick={async () => {
              setLoading(true);
              try {
                const syncResult = await dataService.syncSchema();
                if (syncResult.success) {
                  toast.success(syncResult.message);
                  setTimeout(() => window.location.reload(), 1000);
                } else {
                  setSqlScript(dataService.getSchemaSQL());
                  setShowSqlModal(true);
                  toast.error(syncResult.message);
                }
              } catch (err) {
                toast.error('שגיאה בסנכרון');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="mb-4 text-xs font-bold text-slate-400 hover:text-luxury-blue flex items-center gap-1"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            סנכרון מסד נתונים (SQL)
          </button>
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
                    <p className="text-sm text-text-secondary">כניסה עם שם משתמש, טלפון או אימייל</p>
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

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-text-main mb-2">שם משתמש, אימייל או טלפון</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        className="input-field pr-12"
                        placeholder="הזן שם משתמש, אימייל או טלפון"
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
