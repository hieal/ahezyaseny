import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Shield, Database, CheckCircle, XCircle, Info } from 'lucide-react';

export default function ConnectivityMonitor() {
  const [status, setStatus] = useState({
    database: { ok: false, loading: true, error: null as string | null },
    auth: { ok: false, loading: false },
    api: { ok: false, loading: true }
  });

  const checkConnectivity = async () => {
    // 1. Database Check
    try {
      const { error } = await supabase.from('admins').select('id', { count: 'exact', head: true });
      if (error) throw error;
      setStatus(prev => ({ ...prev, database: { ok: true, loading: false, error: null } }));
    } catch (err: any) {
      console.error('[CONNECTION_ERROR] Database connection failed:', err);
      setStatus(prev => ({ ...prev, database: { ok: false, loading: false, error: err.message || 'Unknown error' } }));
    }

    // 2. Auth Key Check
    const googleClientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
    const hasGoogleKey = !!googleClientId && googleClientId.length > 0;
    if (!hasGoogleKey) {
      console.error('[CONNECTION_ERROR] Google Client ID is missing in environment variables.');
    }
    setStatus(prev => ({ ...prev, auth: { ok: hasGoogleKey, loading: false } }));

    // 3. API Check
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setStatus(prev => ({ ...prev, api: { ok: true, loading: false } }));
      } else {
        throw new Error(`Server responded with ${res.status}`);
      }
    } catch (err: any) {
      console.error('[CONNECTION_ERROR] API server is unreachable:', err);
      setStatus(prev => ({ ...prev, api: { ok: false, loading: false } }));
    }
  };

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
      <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-2xl pointer-events-auto flex items-center gap-4">
        <StatusItem 
          label="מסד נתונים" 
          ok={status.database.ok} 
          loading={status.database.loading} 
          icon={<Database size={14} />}
          error={status.database.error}
        />
        <div className="w-px h-6 bg-slate-200" />
        <StatusItem 
          label="אישור גוגל" 
          ok={status.auth.ok} 
          loading={status.auth.loading} 
          icon={<Shield size={14} />}
        />
        <div className="w-px h-6 bg-slate-200" />
        <StatusItem 
          label="API שרת" 
          ok={status.api.ok} 
          loading={status.api.loading} 
          icon={<Activity size={14} />}
        />
      </div>
    </div>
  );
}

function StatusItem({ label, ok, loading, icon, error }: { label: string, ok: boolean, loading: boolean, icon: React.ReactNode, error?: string | null }) {
  return (
    <div className="flex items-center gap-2 group relative">
      <div className={`p-1.5 rounded-lg ${ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} transition-colors`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{label}</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-slate-300 animate-pulse' : ok ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
          <span className="text-[11px] font-bold text-slate-700">{loading ? 'בודק...' : ok ? 'תקין' : 'שגיאה'}</span>
        </div>
      </div>
      
      {!ok && error && (
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[10000]">
          <div className="bg-slate-900 text-white text-[10px] px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-slate-700">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
