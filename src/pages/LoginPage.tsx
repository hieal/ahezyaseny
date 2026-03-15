import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackend } from '../contexts/BackendContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { LogIn, User, Lock, Heart, ShieldCheck, ShieldAlert, Users, Eye, EyeOff, Send, ClipboardList, UserCheck, Database, Cloud, Settings, RefreshCw, Copy, X, Zap, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME } from '../constants';
import { getGenderedText } from '../utils/gender';
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
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
        const { error } = await tempClient.from('profiles').select('id').limit(1);

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
      const { error: adminsError } = await supabase.from('profiles').select('id, phone').limit(1);
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
        toast.success(getGenderedText(user.gender, 'ברוך הבא!', 'ברוכה הבאה!'));
        navigate('/');
      } else {
        setErrorMessage('שם משתמש או סיסמה שגויים. אנא נסה שוב.');
        setShowErrorModal(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'שגיאה בחיבור למסד הנתונים');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBypassLogin = async () => {
    setLoading(true);
    try {
      // First check if profiles table exists
      const { error: checkError } = await supabase.from('profiles').select('id').limit(1);
      
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

                  {loginType === 'admin' && (
                    <div className="pt-4 space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-slate-100"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-slate-400 font-bold">או התחברות מהירה</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const { error } = await supabase.auth.signInWithOAuth({
                              provider: 'google',
                              options: {
                                redirectTo: window.location.origin,
                              }
                            });
                            if (error) throw error;
                          } catch (err: any) {
                            toast.error('שגיאה בהתחברות עם גוגל: ' + err.message);
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="w-full py-3.5 flex items-center justify-center gap-3 text-sm rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                      >
                        <Globe size={18} className="text-blue-500" />
                        התחברות באמצעות Google
                      </button>
                    </div>
                  )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <p className="text-center text-slate-400 text-sm mt-10 font-medium">
          &copy; 2026 {APP_NAME}
        </p>

        {/* Login Error Modal */}
        <AnimatePresence>
          {showErrorModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[3rem] p-10 shadow-2xl max-w-md w-full text-center space-y-8 border border-slate-100 relative overflow-hidden"
              >
                {/* Decorative background element */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-50 rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50" />
                
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-red-200/50">
                    <ShieldAlert size={48} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="space-y-3 relative">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">שגיאת התחברות</h3>
                  <div className="h-1.5 w-12 bg-red-500 rounded-full mx-auto mb-4" />
                  <p className="text-slate-500 font-bold text-lg leading-relaxed">{errorMessage}</p>
                </div>

                <button 
                  onClick={() => setShowErrorModal(false)}
                  className="w-full py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl font-black text-lg hover:from-slate-800 hover:to-slate-700 transition-all shadow-xl shadow-slate-200 active:scale-95 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                    נסה שוב
                  </span>
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
