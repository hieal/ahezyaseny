import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle2, XCircle, Info, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createSupabaseClient } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { SupabaseClient } from '@supabase/supabase-js';
import { useSupabase } from '../contexts/SupabaseContext';

export const ConnectionDebugger: React.FC = () => {
  const { updateClient } = useSupabase();
  const envUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

  const [customUrl, setCustomUrl] = useState(envUrl);
  const [customKey, setCustomKey] = useState(envKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const isSameAsEnv = customUrl === envUrl && customKey === envKey;

  const handleTestConnection = async () => {
    if (!customUrl || !customKey) {
      toast.error('אנא הזן כתובת URL ומפתח תקינים');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const client = createSupabaseClient(customUrl, customKey);
      
      // Try to fetch a simple count from a common table or just check health
      // We'll try to select from 'admins' as it's our core table
      const { error, status } = await client.from('admins').select('id', { count: 'exact', head: true });

      if (error) {
        // If the table doesn't exist, it might still be a valid connection but uninitialized
        if (error.code === '42P01') {
          setTestResult({ 
            success: true, 
            message: 'החיבור הצליח! (אך הטבלאות עדיין לא קיימות במסד זה)' 
          });
          toast.success('חיבור לסופאבייס הצליח!');
          updateClient(customUrl, customKey);
        } else {
          setTestResult({ 
            success: false, 
            message: `שגיאת חיבור: ${error.message} (קוד: ${error.code})` 
          });
          toast.error('החיבור נכשל');
        }
      } else {
        setTestResult({ 
          success: true, 
          message: 'מחובר לסופאבייס בהצלחה! המסד תקין ומאותחל.' 
        });
        toast.success('החיבור הצליח!');
        updateClient(customUrl, customKey);
      }
    } catch (err: any) {
      setTestResult({ 
        success: false, 
        message: `שגיאה קריטית: ${err.message || 'לא ניתן ליצור קשר עם השרת'}` 
      });
      toast.error('החיבור נכשל');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
      <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-luxury-blue/10 text-luxury-blue rounded-xl">
            <Database size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 leading-tight">מאתר תקלות חיבור (Debugger)</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">בדיקת סנכרון מול Supabase</p>
          </div>
        </div>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-bold text-luxury-blue hover:underline flex items-center gap-1"
        >
          {showDetails ? 'הסתר פרטים' : 'הצג פרטים'}
          <Info size={14} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <AnimatePresence>
          {showDetails && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-4"
            >
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                <p className="text-xs font-bold text-blue-800 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  פרטי סביבה נוכחיים (Vercel/Env):
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase">Supabase URL</label>
                    <p className="text-xs font-mono break-all bg-white p-2 rounded-lg border border-blue-100">{envUrl || 'לא מוגדר'}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase">Anon Key</label>
                    <p className="text-xs font-mono break-all bg-white p-2 rounded-lg border border-blue-100">
                      {envKey ? (showKey ? envKey : '********************************') : 'לא מוגדר'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
              כתובת Supabase URL חדשה
              {!isSameAsEnv && (
                <span className="text-[10px] text-amber-600 font-black bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                  שונה מהגדרות המערכת
                </span>
              )}
            </label>
            <input 
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="input-field text-sm font-mono"
              placeholder="https://your-project.supabase.co"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
              מפתח Anon Key חדש
              <button onClick={() => setShowKey(!showKey)} className="text-slate-400 hover:text-luxury-blue">
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </label>
            <input 
              type={showKey ? "text" : "password"}
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="input-field text-sm font-mono"
              placeholder="your-anon-key"
            />
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 font-bold"
            >
              {isTesting ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              בדיקת סנכרון וחיבור
            </button>
            <button 
              onClick={() => {
                setCustomUrl(envUrl);
                setCustomKey(envKey);
                setTestResult(null);
              }}
              className="px-4 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
            >
              איפוס
            </button>
          </div>
        </div>

        <AnimatePresence>
          {testResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                testResult.success 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-red-50 border-red-100 text-red-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
              ) : (
                <XCircle size={20} className="mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">{testResult.success ? 'החיבור תקין!' : 'החיבור נכשל'}</p>
                <p className="text-xs opacity-90 mt-1 leading-relaxed">{testResult.message}</p>
                {testResult.success && !isSameAsEnv && (
                  <p className="text-[10px] font-black mt-2 uppercase tracking-tight text-emerald-600">
                    שים לב: המערכת בדף זה תשתמש כעת בחיבור החדש.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <div className={`w-2 h-2 rounded-full ${isSameAsEnv ? 'bg-green-500' : 'bg-amber-500'}`}></div>
            {isSameAsEnv ? 'מסונכרן עם הגדרות Vercel' : 'במצב עריכה ידנית (שונה מ-Vercel)'}
          </div>
        </div>
      </div>
    </div>
  );
};
