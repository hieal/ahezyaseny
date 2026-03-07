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
  const [customUrl, setCustomUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [customKey, setCustomKey] = useState(localStorage.getItem('supabase_key') || '');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlScript, setSqlScript] = useState('');
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [quickConnectText, setQuickConnectText] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

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
      // Check connection and tables
      const { error: adminsError } = await supabase.from('admins').select('id').limit(1);
      const { error: matchesError } = await supabase.from('matches').select('id').limit(1);

      if (!adminsError && !matchesError) {
        toast.success('חיבור תקין ומבנה נתונים מאומת!');
        setMode('production');
        localStorage.setItem('backend_mode', 'production');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        // Generate SQL
        const script = `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  category TEXT,
  secondary_category TEXT,
  gender TEXT,
  phone TEXT,
  google_login_allowed TEXT DEFAULT 'false',
  avatar_url TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  daily_message_template TEXT,
  daily_message_template_male TEXT,
  daily_message_template_female TEXT,
  is_from_file INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 0,
  is_shaham_manager INTEGER DEFAULT 0,
  password_updated_at TIMESTAMP WITH TIME ZONE,
  password_plain TEXT,
  assigned_group_id UUID,
  created_by INTEGER,
  creator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  height TEXT,
  ethnicity TEXT,
  marital_status TEXT,
  city TEXT,
  religious_level TEXT,
  service TEXT,
  occupation TEXT,
  about TEXT,
  looking_for TEXT,
  smoking TEXT,
  negiah TEXT,
  age_range TEXT,
  image_url TEXT,
  additional_images TEXT,
  created_by UUID,
  creator_name TEXT,
  creator_category TEXT,
  creator_gender TEXT,
  creator_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_published_at TIMESTAMP WITH TIME ZONE,
  publish_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMP WITH TIME ZONE,
  phone TEXT,
  is_published_confirmed INTEGER DEFAULT 0,
  crop_config TEXT,
  creation_source TEXT
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_name TEXT,
  action TEXT,
  details TEXT,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create publish_logs table
CREATE TABLE IF NOT EXISTS publish_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID,
  match_name TEXT,
  user_id UUID,
  user_name TEXT,
  group_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
        setSqlScript(script);
        setShowSqlModal(true);
        toast.error('חסרות טבלאות במסד הנתונים. אנא הרץ את ה-SQL המצורף.');
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

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg-gray">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl text-center"
        >
          <div className="inline-flex items-center justify-center p-6 rounded-3xl bg-white shadow-xl mb-8 border border-slate-100">
            <Logo size={80} showText={false} />
          </div>
          <h1 className="text-4xl font-black text-text-main mb-4">בחירת סביבת עבודה</h1>
          <p className="text-lg text-text-secondary mb-12 max-w-md mx-auto font-medium">
            בחר את השרת אליו תרצה להתחבר כדי להתחיל לעבוד במערכת
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button 
              onClick={() => setMode('temporary')}
              className="group relative p-8 bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-luxury-blue text-right"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-luxury-blue flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Database size={32} />
              </div>
              <h3 className="text-2xl font-black text-text-main mb-2">שרת זמני</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Offline / Studio Mode
                <br />
                שמירת נתונים ב-LocalStorage של הדפדפן בלבד.
              </p>
              <div className="mt-6 flex items-center text-luxury-blue font-bold gap-2">
                <span>בחר במצב זה</span>
                <LogIn size={18} />
              </div>
            </button>

            <button 
              onClick={() => setMode('production')}
              className="group relative p-8 bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-emerald-500 text-right"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cloud size={32} />
              </div>
              <h3 className="text-2xl font-black text-text-main mb-2">שרת קבוע</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Production / Vercel
                <br />
                חיבור ישיר ל-Supabase לשמירה קבועה בענן.
              </p>
              <div className="mt-6 flex items-center text-emerald-600 font-bold gap-2">
                <span>בחר במצב זה</span>
                <LogIn size={18} />
              </div>
            </button>
          </div>

          <div className="mt-12 max-w-2xl mx-auto text-right" dir="rtl">
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
                <Settings size={20} className="text-slate-400" />
                הגדרות חיבור (Connection Settings)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Supabase URL</label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-luxury-blue focus:border-transparent outline-none transition-all"
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Supabase Key</label>
                  <input
                    type="password"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-luxury-blue focus:border-transparent outline-none transition-all"
                    placeholder="eyJ..."
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveKeys}
                    className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-md active:scale-95"
                  >
                    שמור מפתחות
                  </button>
                  <button
                    onClick={() => setShowQuickConnect(true)}
                    className="px-4 py-3 bg-yellow-50 text-yellow-600 rounded-xl font-bold hover:bg-yellow-100 transition-colors shadow-sm active:scale-95 flex items-center justify-center"
                    title="חיבור מהיר"
                  >
                    <Zap size={20} />
                  </button>
                  <button
                    onClick={handleSyncSchema}
                    disabled={loading}
                    className="px-4 py-3 bg-blue-50 text-luxury-blue rounded-xl font-bold hover:bg-blue-100 transition-colors shadow-sm active:scale-95 flex items-center justify-center"
                    title="סנכרון מבנה נתונים"
                  >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {showSqlModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
                dir="rtl"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Database size={24} className="text-luxury-blue" />
                    נדרש עדכון מסד נתונים
                  </h3>
                  <button onClick={() => setShowSqlModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  <p className="text-slate-600 mb-4">
                    המערכת זיהתה שחסרות טבלאות ב-Supabase. אנא העתק את ה-SQL הבא והרץ אותו ב-SQL Editor בלוח הבקרה של Supabase:
                  </p>
                  
                  <div className="relative">
                    <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap h-64" dir="ltr">
                      {sqlScript}
                    </pre>
                    <button 
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                      title="העתק ללוח"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button 
                    onClick={() => setShowSqlModal(false)}
                    className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    סגור
                  </button>
                  <button 
                    onClick={() => {
                      copyToClipboard();
                      window.open('https://supabase.com/dashboard/project/_/sql/new', '_blank');
                    }}
                    className="px-6 py-2 bg-luxury-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
                  >
                    <Copy size={18} />
                    העתק ופתח Supabase
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showQuickConnect && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
                dir="rtl"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Zap size={24} className="text-yellow-500" />
                    חיבור מהיר ל-Supabase
                  </h3>
                  <button onClick={() => setShowQuickConnect(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6">
                  <p className="text-slate-600 mb-4">
                    הדבק כאן את הטקסט מ-Supabase (או את ה-URL וה-Key), והמערכת תזהה אותם אוטומטית.
                  </p>
                  <textarea
                    value={quickConnectText}
                    onChange={(e) => setQuickConnectText(e.target.value)}
                    className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-luxury-blue outline-none resize-none"
                    placeholder="הדבק כאן..."
                    dir="ltr"
                  />
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button 
                    onClick={() => setShowQuickConnect(false)}
                    className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    ביטול
                  </button>
                  <button 
                    onClick={handleQuickConnect}
                    disabled={loading}
                    className="px-6 py-2 bg-luxury-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
                  >
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
                    חבר אותי
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          <p className="mt-12 text-slate-400 text-sm font-medium">
            &copy; 2026 {APP_NAME} | Dual-Backend System
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-gray">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <button 
            onClick={() => {
              localStorage.removeItem('backend_mode');
              window.location.reload();
            }}
            className="mb-4 text-xs font-bold text-slate-400 hover:text-luxury-blue flex items-center gap-1"
          >
            <Database size={12} />
            החלף שרת ({mode === 'temporary' ? 'זמני' : 'קבוע'})
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
