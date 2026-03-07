import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackend } from '../contexts/BackendContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { LogIn, User, Lock, Heart, ShieldCheck, Users, Eye, EyeOff, Send, ClipboardList, UserCheck, Database, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APP_NAME } from '../constants';
import { Logo } from '../components/Logo';
import { dataService } from '../services/dataService';

export default function LoginPage() {
  const { mode, setMode } = useBackend();
  const [loginType, setLoginType] = useState<'selection' | 'super' | 'admin'>('selection');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
    } catch (err) {
      toast.error('שגיאה בחיבור למסד הנתונים');
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
