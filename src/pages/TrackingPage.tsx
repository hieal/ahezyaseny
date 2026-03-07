import React, { useState, useEffect } from 'react';
import { ActivityLog, User, PublishLog, Match } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { History, Search, Filter, Calendar, RefreshCw, User as UserIcon, Info, Send, CheckCircle, MessageSquare, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { useSupabase } from '../contexts/SupabaseContext';

export default function TrackingPage() {
  const { user } = useAuth();
  const { client } = useSupabase();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [publishLogs, setPublishLogs] = useState<PublishLog[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'publishing'>('activity');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const getAvailableMonths = (logs: any[]) => {
    const months = new Set<string>();
    logs.forEach(log => {
      const d = new Date(log.created_at);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
  };

  const filterByMonth = (logs: any[]) => {
    if (!selectedMonth) return logs;
    return logs.filter(log => {
      const d = new Date(log.created_at);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === selectedMonth;
    });
  };

  const availableActivityMonths = getAvailableMonths(logs);
  const availablePublishMonths = getAvailableMonths(publishLogs);
  const currentAvailableMonths = activeTab === 'activity' ? availableActivityMonths : availablePublishMonths;

  const filteredActivityLogs = filterByMonth(logs);
  const filteredPublishLogs = filterByMonth(publishLogs);
  const [filters, setFilters] = useState({
    userId: '',
    dateFrom: '',
    dateTo: ''
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = client
        .from('activity_logs')
        .select(`
          *,
          user:admins(name)
        `)
        .order('created_at', { ascending: false });

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

      const { data, error } = await query;
      if (data) {
        setLogs(data.map(log => ({
          ...log,
          user_name: log.user?.name
        })));
      }
    } catch (err) {
      toast.error('שגיאה בטעינת מעקב פעולות');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (user?.role !== 'super_admin') return;
    try {
      const { data, error } = await client
        .from('admins')
        .select('*')
        .is('deleted_at', null);
      if (data) {
        setUsers(data as User[]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchPublishLogs = async () => {
    try {
      const { data, error } = await client
        .from('publish_logs')
        .select(`
          *,
          match:matches(name),
          user:admins(name)
        `)
        .order('created_at', { ascending: false });

      if (data) {
        setPublishLogs(data.map(log => ({
          ...log,
          match_name: log.match?.name,
          user_name: log.user?.name
        })));
      }
    } catch (err) {
      console.error('Error fetching publish logs:', err);
    }
  };

  const fetchMatches = async () => {
    try {
      const { data, error } = await client
        .from('matches')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (data) setMatches(data as Match[]);
    } catch (err) {
      console.error('Error fetching matches:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    fetchPublishLogs();
    fetchMatches();
  }, [filters]);

  const handleConfirmPublish = async (matchId: number, confirmed: boolean) => {
    try {
      const { error } = await client
        .from('matches')
        .update({ is_published_confirmed: confirmed ? 1 : 0 })
        .eq('id', matchId);

      if (!error) {
        toast.success(confirmed ? 'הפרסום אושר' : 'האישור בוטל');
        fetchMatches();
      }
    } catch (err) {
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const handleUpdatePhone = async (matchId: number, phone: string) => {
    try {
      const { error } = await client
        .from('matches')
        .update({ phone })
        .eq('id', matchId);

      if (!error) {
        toast.success('מספר הטלפון עודכן');
        fetchMatches();
      }
    } catch (err) {
      toast.error('שגיאה בעדכון הטלפון');
    }
  };

  const handleRestore = async (log: ActivityLog) => {
    if (!log.entity_id) return;
    
    const entityName = log.entity_type === 'match' ? 'המשודך' : 'המנהל';
    if (!confirm(`האם אתה בטוח שברצונך לשחזר את ${entityName} שנמחק?`)) return;

    try {
      const table = log.entity_type === 'match' ? 'matches' : 'admins';
      const { error } = await client
        .from(table)
        .update({ deleted_at: null })
        .eq('id', log.entity_id);

      if (!error) {
        toast.success(`${entityName} שוחזר בהצלחה`);
        fetchLogs();
      } else {
        toast.error(`שגיאה בשחזור ${entityName}`);
      }
    } catch (err) {
      toast.error('שגיאה בתקשורת');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-text-main tracking-tight flex items-center gap-3">
            <History className="text-luxury-blue" size={36} />
            מעקב מערכת
          </h1>
          <p className="text-text-secondary mt-1 font-medium">צפייה בהיסטוריית הפעולות והפרסומים במערכת</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('activity')}
          className={`pb-4 px-4 font-bold text-sm transition-all relative ${
            activeTab === 'activity' ? 'text-luxury-blue' : 'text-text-secondary hover:text-text-main'
          }`}
        >
          מעקב פעולות מנהלים
          {activeTab === 'activity' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-luxury-blue rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('publishing')}
          className={`pb-4 px-4 font-bold text-sm transition-all relative ${
            activeTab === 'publishing' ? 'text-luxury-blue' : 'text-text-secondary hover:text-text-main'
          }`}
        >
          מעקב פרסומים
          {activeTab === 'publishing' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-luxury-blue rounded-full" />}
        </button>
      </div>

      {/* Month Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedMonth(null)}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            selectedMonth === null ? 'bg-luxury-blue text-white shadow-md' : 'bg-white text-text-secondary border border-slate-200 hover:border-luxury-blue'
          }`}
        >
          הצג כל החודשים
        </button>
        {currentAvailableMonths.map(month => (
          <button
            key={month}
            onClick={() => setSelectedMonth(month)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              selectedMonth === month ? 'bg-luxury-blue text-white shadow-md' : 'bg-white text-text-secondary border border-slate-200 hover:border-luxury-blue'
            }`}
          >
            {formatMonth(month)}
          </button>
        ))}
      </div>

      {activeTab === 'activity' ? (
        <>
          {/* Filters */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {user?.role === 'super_admin' && (
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 pr-1">סנן לפי מנהל</label>
                  <div className="relative">
                    <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      className="input-field pr-10 font-bold"
                      value={filters.userId}
                      onChange={(e) => setFilters({...filters, userId: e.target.value})}
                    >
                      <option value="">כל המנהלים</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 pr-1">מתאריך</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="date" 
                    className="input-field pr-10 font-bold"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 pr-1">עד תאריך</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="date" 
                    className="input-field pr-10 font-bold"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-bottom border-slate-100">
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">תאריך ושעה</th>
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">מנהל</th>
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">פעולה</th>
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">פרטים</th>
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-text-secondary font-bold">טוען נתונים...</td>
                    </tr>
                  ) : filteredActivityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-text-secondary font-bold">לא נמצאו פעולות העונות לסינון</td>
                    </tr>
                  ) : (
                    filteredActivityLogs.map((log) => (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-6 py-5 text-text-secondary font-medium text-sm">
                          {new Date(log.created_at).toLocaleString('he-IL')}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                              <UserIcon size={14} />
                            </div>
                            <span className="text-text-main font-bold">{log.user_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            log.action.includes('מחיקה') ? 'bg-red-50 text-red-600' :
                            log.action.includes('יצירה') ? 'bg-green-50 text-green-600' :
                            log.action.includes('שחזור') ? 'bg-blue-50 text-blue-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-text-secondary font-medium">
                          {log.details}
                        </td>
                        <td className="px-6 py-5">
                          {log.action.includes('מחיקה') && log.entity_id && log.entity_type === 'match' && (
                            <button 
                              onClick={() => handleRestore(log)}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <RefreshCw size={14} />
                              שחזר
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8">
          {/* Publishing Management */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h2 className="text-xl font-extrabold text-text-main">ניהול אישורי פרסום</h2>
              <p className="text-sm text-text-secondary">עדכון מספרי טלפון ואישור פרסום בקבוצות</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-bottom border-slate-100">
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">משודך/ת</th>
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">טלפון</th>
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">תאריך פרסום אחרון</th>
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">אישור פרסום</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {matches.filter(m => m.publish_count > 0).map((match) => (
                    <tr key={match.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5 font-bold text-text-main">{match.name}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            className="input-field py-1 text-xs w-32"
                            defaultValue={match.phone || ''}
                            onBlur={(e) => handleUpdatePhone(match.id, e.target.value)}
                            placeholder="הוסף טלפון..."
                          />
                          {match.phone && (
                            <a 
                              href={`https://wa.me/${match.phone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all"
                            >
                              <MessageSquare size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-text-secondary font-medium text-sm">
                        {match.last_published_at ? new Date(match.last_published_at).toLocaleDateString('he-IL') : '---'}
                      </td>
                      <td className="px-6 py-5">
                        <button 
                          onClick={() => handleConfirmPublish(match.id, !match.is_published_confirmed)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                            match.is_published_confirmed 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <CheckCircle size={14} />
                          {match.is_published_confirmed ? 'פורסם ואושר' : 'סמן כפורסם'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Publish Logs */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h2 className="text-xl font-extrabold text-text-main">היסטוריית פרסומים מפורטת</h2>
              <p className="text-sm text-text-secondary">תיעוד של כל לחיצה על כפתור הפרסום</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-bottom border-slate-100">
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">תאריך פרסום</th>
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">משודך/ת</th>
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">קבוצה</th>
                    <th className="px-6 py-5 font-bold text-text-secondary uppercase tracking-wider text-xs">מנהל מפרסם</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPublishLogs.map((pl) => (
                    <tr key={pl.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5 text-text-secondary font-medium text-sm">
                        {new Date(pl.created_at).toLocaleString('he-IL')}
                      </td>
                      <td className="px-6 py-5 font-bold text-text-main">{pl.match_name}</td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 bg-blue-50 text-luxury-blue rounded-full text-xs font-bold">
                          {pl.group_name}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-text-secondary font-medium">
                        {pl.user_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
