import React, { useState, useEffect } from 'react';
import { Match, PublishLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { History, Search, Filter, Calendar, User as UserIcon, MessageSquare, CheckCircle, X, Eye, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MatchCard from '../components/MatchCard';
import { useSupabase } from '../contexts/SupabaseContext';

export default function MatchesHistoryPage() {
  const { user } = useAuth();
  const { client } = useSupabase();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'male' | 'female'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [publishHistory, setPublishHistory] = useState<PublishLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchConfirmedMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await client
        .from('matches')
        .select('*')
        .is('deleted_at', null)
        .eq('is_published_confirmed', 1)
        .order('created_at', { ascending: false });

      if (data) {
        setMatches(data as Match[]);
      }
    } catch (err) {
      toast.error('שגיאה בטעינת היסטוריית משודכים');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchHistory = async (matchId: number) => {
    try {
      setHistoryLoading(true);
      const { data, error } = await client
        .from('publish_logs')
        .select(`
          *,
          user:admins(name)
        `)
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });

      if (data) {
        setPublishHistory(data.map(log => ({
          ...log,
          user_name: log.user?.name
        })));
      }
    } catch (err) {
      toast.error('שגיאה בטעינת היסטוריית פרסומים');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchConfirmedMatches();
  }, []);

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    fetchMatchHistory(match.id);
  };

  const filteredMatches = matches.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                         m.city?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || m.type === filterType;
    
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const matchDate = new Date(m.created_at);
      if (dateFrom && matchDate < new Date(dateFrom)) matchesDate = false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (matchDate > end) matchesDate = false;
      }
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-text-main tracking-tight flex items-center gap-3">
            <History className="text-luxury-blue" size={36} />
            היסטוריית משודכים
          </h1>
          <p className="text-text-secondary mt-1 font-medium">צפייה בכרטיסי משודכים שאושרו והיסטוריית הפרסומים שלהם</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="חיפוש לפי שם או עיר..."
              className="input-field pr-10 font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              className="input-field pr-10 font-bold"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">כל הסוגים</option>
              <option value="male">בנים</option>
              <option value="female">בנות</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="date" 
              className="input-field pr-10 font-bold"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="מתאריך"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="date" 
              className="input-field pr-10 font-bold"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="עד תאריך"
            />
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-3xl" />
          ))
        ) : filteredMatches.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <UserIcon size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-text-secondary font-bold">לא נמצאו משודכים מאושרים העונים לסינון</p>
          </div>
        ) : (
          filteredMatches.map((match) => (
            <motion.div
              key={match.id}
              layoutId={`match-${match.id}`}
              onClick={() => handleMatchClick(match)}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-luxury-blue transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-2 h-full ${match.type === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${match.type === 'male' ? 'bg-blue-600' : 'bg-pink-600'}`}>
                    {match.name[0]}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-text-main text-lg">{match.name}</h3>
                    <p className="text-xs text-text-secondary font-bold">{match.city} • {match.age} שנים</p>
                  </div>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-luxury-blue transition-colors">
                  <Eye size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-text-secondary">פרסומים:</span>
                  <span className="text-luxury-blue bg-blue-50 px-2 py-0.5 rounded-full">{match.publish_count}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-text-secondary">פרסום אחרון:</span>
                  <span className="text-text-main">
                    {match.last_published_at ? new Date(match.last_published_at).toLocaleDateString('he-IL') : '---'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  נוצר: {new Date(match.created_at).toLocaleDateString('he-IL')}
                </span>
                <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle size={10} /> מאושר
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Match Detail Modal */}
      <AnimatePresence>
        {selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              {/* Left Side: Match Details */}
              <div className="w-full md:w-1/2 border-l border-slate-100 overflow-y-auto custom-scrollbar bg-slate-50/30">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <button 
                      onClick={() => setSelectedMatch(null)}
                      className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-xl shadow-sm border border-slate-100 transition-all"
                    >
                      <X size={24} />
                    </button>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 ${selectedMatch.type === 'male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                      <UserIcon size={14} />
                      {selectedMatch.type === 'male' ? 'משודך (בן)' : 'משודכת (בת)'}
                    </div>
                  </div>

                  <MatchCard match={selectedMatch} />
                </div>
              </div>

              {/* Right Side: Publication History */}
              <div className="w-full md:w-1/2 flex flex-col bg-white">
                <div className="p-8 border-b border-slate-50">
                  <h2 className="text-2xl font-extrabold text-text-main flex items-center gap-3">
                    <Clock className="text-luxury-blue" size={24} />
                    היסטוריית פרסומים
                  </h2>
                  <p className="text-text-secondary text-sm font-medium mt-1">תיעוד כל הפרסומים של {selectedMatch.name} בקבוצות</p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {historyLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                      <RefreshCw className="animate-spin text-luxury-blue" size={32} />
                      <p className="text-text-secondary font-bold">טוען היסטוריה...</p>
                    </div>
                  ) : publishHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                      <MessageSquare size={48} className="text-slate-300" />
                      <p className="text-text-secondary font-bold">טרם בוצעו פרסומים לכרטיס זה</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {publishHistory.map((log, index) => (
                        <motion.div 
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative pr-8 pb-6 border-r-2 border-slate-100 last:pb-0"
                        >
                          <div className="absolute -right-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-luxury-blue shadow-sm" />
                          
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-luxury-blue bg-blue-50 px-2 py-0.5 rounded-full">
                                {log.group_name}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(log.created_at).toLocaleString('he-IL')}
                              </span>
                            </div>
                            <p className="text-sm text-text-main font-bold mb-2">פורסם על ידי: {log.user_name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                              <CheckCircle size={12} className="text-green-500" />
                              נשלח בהצלחה לקבוצה
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={() => setSelectedMatch(null)}
                    className="w-full py-4 bg-white text-text-main font-bold rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-100 transition-all"
                  >
                    סגור היסטוריה
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
