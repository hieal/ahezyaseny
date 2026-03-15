import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { CheckCircle, XCircle, RefreshCw, Image as ImageIcon, User, Users, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

interface SyncItem {
  id: string;
  name: string;
  type: 'admin' | 'match';
  url: string;
  isSynced: boolean;
  status: 'pending' | 'syncing' | 'success' | 'failed';
}

export const ImageSyncDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [items, setItems] = useState<SyncItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'admin' | 'match' | 'pending'>('all');
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const filteredItems = items.filter(item => {
    if (filter === 'admin') return item.type === 'admin';
    if (filter === 'match') return item.type === 'match';
    if (filter === 'pending') return !item.isSynced;
    return true;
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const inventory = await dataService.getImageSyncInventory();
      setItems(inventory.map(item => ({
        ...item,
        status: item.isSynced ? 'success' : 'pending'
      })));
    } catch (err) {
      toast.error('שגיאה בטעינת רשימת התמונות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const syncSingle = async (item: SyncItem) => {
    if (item.status === 'success' || item.status === 'syncing') return;

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'syncing' } : i));
    
    try {
      const result = await dataService.mirrorSingleImage(item.id, item.type, item.url);
      if (result) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', isSynced: true, url: result } : i));
      } else {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed' } : i));
      }
    } catch (err) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed' } : i));
    }
  };

  const syncAll = async () => {
    const itemsToSync = filteredItems.filter(i => i.status === 'pending' || i.status === 'failed');
    if (itemsToSync.length === 0) {
      toast.success('אין תמונות לסנכרון לפי הסינון הנוכחי');
      return;
    }

    setIsSyncingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of itemsToSync) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'syncing' } : i));
      try {
        const result = await dataService.mirrorSingleImage(item.id, item.type, item.url);
        if (result) {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'success', isSynced: true, url: result } : i));
          successCount++;
        } else {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed' } : i));
          failCount++;
        }
      } catch (err) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'failed' } : i));
        failCount++;
      }
    }

    setIsSyncingAll(false);
    toast.success(`הסנכרון הסתיים: ${successCount} הצליחו, ${failCount} נכשלו`);
  };

  const stats = {
    total: items.length,
    synced: items.filter(i => i.isSynced).length,
    pending: items.filter(i => !i.isSynced).length,
    admins: items.filter(i => i.type === 'admin').length,
    matches: items.filter(i => i.type === 'match').length,
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-luxury-blue text-white rounded-xl">
              <RefreshCw size={24} className={isSyncingAll ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">מרכז סנכרון תמונות</h2>
              <p className="text-xs text-slate-500 font-bold">ניהול ואחסון תמונות חיצוניות בשרת המערכת</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <XCircle size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 bg-white border-b border-slate-100">
          <div className="flex gap-2 mb-6">
            {(['all', 'admin', 'match', 'pending'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filter === f ? 'bg-luxury-blue text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? 'הכל' : f === 'admin' ? 'מנהלים' : f === 'match' ? 'משודכים' : 'לא סונכרנו'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 text-center">
              <p className="text-[10px] font-black text-blue-600 uppercase">סה"כ תמונות</p>
              <p className="text-2xl font-black text-blue-900">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-2xl border border-green-100 text-center">
              <p className="text-[10px] font-black text-green-600 uppercase">סונכרנו</p>
              <p className="text-2xl font-black text-green-900">{stats.synced}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-center">
              <p className="text-[10px] font-black text-amber-600 uppercase">ממתינים</p>
              <p className="text-2xl font-black text-amber-900">{stats.pending}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 text-center">
              <p className="text-[10px] font-black text-purple-600 uppercase">מנהלים</p>
              <p className="text-2xl font-black text-purple-900">{stats.admins}</p>
            </div>
            <div className="bg-pink-50 p-3 rounded-2xl border border-pink-100 text-center">
              <p className="text-[10px] font-black text-pink-600 uppercase">משודכים</p>
              <p className="text-2xl font-black text-pink-900">{stats.matches}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 size={48} className="text-luxury-blue animate-spin" />
              <p className="font-bold text-slate-500">טוען רשימת תמונות...</p>
            </div>
          ) : (
            <table className="w-full text-right">
              <thead className="sticky top-0 bg-white z-10 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">תצוגה</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">שם</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">סוג</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">סטטוס</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase text-center">פעולה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <img 
                          src={item.url} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          alt={item.name}
                        />
                        {item.isSynced && (
                          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                            <CheckCircle size={16} className="text-green-600 drop-shadow-md" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[200px]" title={item.url}>{item.url}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${
                        item.type === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {item.type === 'admin' ? <User size={10} /> : <Users size={10} />}
                        {item.type === 'admin' ? 'מנהל' : 'משודך'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'success' && (
                        <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                          <CheckCircle size={14} />
                          סונכרן
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                          <RefreshCw size={14} />
                          ממתין
                        </span>
                      )}
                      {item.status === 'syncing' && (
                        <span className="text-luxury-blue text-xs font-bold flex items-center gap-1">
                          <Loader2 size={14} className="animate-spin" />
                          מסנכרן...
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="text-red-500 text-xs font-bold flex items-center gap-1">
                          <AlertCircle size={14} />
                          נכשל
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => syncSingle(item)}
                        disabled={item.status === 'success' || item.status === 'syncing' || isSyncingAll}
                        className={`p-2 rounded-xl transition-all ${
                          item.status === 'success' 
                            ? 'text-green-500 bg-green-50 cursor-default' 
                            : 'text-luxury-blue hover:bg-blue-50 border border-transparent hover:border-blue-200'
                        } disabled:opacity-50`}
                      >
                        <RefreshCw size={18} className={item.status === 'syncing' ? 'animate-spin' : ''} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500 font-bold">
            {stats.pending > 0 ? `נותרו ${stats.pending} תמונות לסנכרון` : 'כל התמונות מסונכרנות בהצלחה'}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all"
            >
              סגור
            </button>
            <button 
              onClick={syncAll}
              disabled={isSyncingAll || stats.pending === 0}
              className="px-8 py-2 bg-luxury-blue text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSyncingAll ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {isSyncingAll ? 'מסנכרן הכל...' : 'סנכרן את כל התמונות'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
