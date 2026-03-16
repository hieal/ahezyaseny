import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { useNavigate } from 'react-router-dom';
import { Match, GameScore, WhatsAppGroup, PortalSettings, PublishLog, User as UserType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, MessageSquare, Users, Trophy, Gamepad2, 
  Zap, Clock, Send, ChevronLeft, Star, TrendingUp,
  User, Shield, LogOut, Sparkles, Download, Eye,
  Layout, Smartphone, ExternalLink, Info, MapPin
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';

export default function CandidateDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dailySuggestion, setDailySuggestion] = useState<Match | null>(null);
  const [onlineStats, setOnlineStats] = useState({ males: 0, females: 0 });
  const [leaderboard, setLeaderboard] = useState<GameScore[]>([]);
  const [myMatch, setMyMatch] = useState<Match | null>(null);
  const [groupInfo, setGroupInfo] = useState<{ mainGroup: WhatsAppGroup | null, observerGroups: WhatsAppGroup[] }>({ mainGroup: null, observerGroups: [] });
  const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null);
  const [publishedToday, setPublishedToday] = useState<PublishLog[]>([]);
  const [manager, setManager] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [viewMode, setViewMode] = useState<'standard' | 'designed'>('standard');
  const cardRef = useRef<HTMLDivElement>(null);

  const fetchData = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const [suggestion, stats, topScores, match, settings] = await Promise.all([
        dataService.getDailySuggestion(user.category || '', user.gender || 'male'),
        dataService.getOnlineStats(),
        dataService.getLeaderboard(),
        dataService.getMatchById(user.id),
        dataService.getPortalSettings()
      ]);
      setDailySuggestion(suggestion);
      setOnlineStats(stats);
      setLeaderboard(topScores);
      setMyMatch(match);
      setPortalSettings(settings);

      // Fetch manager details if assigned
      if (user.created_by) {
        const managerData = await dataService.getAdminById(user.created_by);
        setManager(managerData);
      }

      // Fetch groups based on match info
      let viewerIds: string[] = [];
      if (match?.viewer_group_ids) {
        try {
          viewerIds = JSON.parse(match.viewer_group_ids);
        } catch (e) {}
      }
      
      const groups = await dataService.getCandidateGroupInfo(
        user.category || '', 
        user.gender || 'male', 
        viewerIds,
        portalSettings?.whatsapp_group_id
      );
      setGroupInfo(groups);

      // Fetch published today for main group
      if (groups.mainGroup) {
        const published = await dataService.getPublishedCardsForGroup(groups.mainGroup.id);
        setPublishedToday(published);
      }

      if (isRefresh) toast.success('הנתונים עודכנו');
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (isRefresh) toast.error('שגיאה בעדכון הנתונים');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    
    setSending(true);
    try {
      if (user.created_by) {
        await dataService.sendInternalMessage({
          sender_id: user.id,
          sender_name: user.full_name,
          receiver_id: user.created_by,
          content: message
        });
        toast.success('ההודעה נשלחה למנהל האישי שלך');
        setMessage('');
      } else {
        toast.error('לא נמצא מנהל אישי משויך');
      }
    } catch (err) {
      toast.error('שגיאה בשליחת ההודעה');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    
    try {
      toast.loading('מכין את הכרטיס להורדה...', { id: 'downloading' });
      
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2, // Higher quality
        backgroundColor: null
      });
      
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.download = `profile-card-${myMatch?.name || 'candidate'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('הכרטיס הורד בהצלחה!', { id: 'downloading' });
    } catch (err) {
      console.error('Error generating card image:', err);
      toast.error('שגיאה ביצירת הכרטיס', { id: 'downloading' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.[0]
              )}
            </div>
            <div>
              <h1 className="font-bold text-slate-900">שלום, משודך</h1>
              <p className="text-xs text-slate-500 font-medium">{user?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 text-slate-400 hover:text-emerald-500 transition-all rounded-full hover:bg-emerald-50 ${refreshing ? 'animate-spin text-emerald-500' : ''}`}
              title="רענן נתונים"
            >
              <Zap size={20} fill={refreshing ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-8">
        {/* Personal Manager Section */}
        {manager && (
          <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl transition-all group-hover:scale-150" />
            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-3xl overflow-hidden shadow-inner border-4 border-white">
                  {manager.avatar_url ? (
                    <img src={manager.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    manager.full_name?.[0]
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                  <Shield size={16} />
                </div>
              </div>
              <div className="flex-1 text-center md:text-right">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  {manager.gender === 'female' ? 'המנהלת האישית שלך' : 'המנהל האישי שלך'}
                </h2>
                <h3 className="text-2xl font-black text-slate-900 mb-2">{manager.full_name}</h3>
                <p className="text-sm text-slate-500 font-medium mb-4">זמינה עבורך לכל שאלה, התייעצות או עדכון בכרטיס שלך.</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  {manager.phone && (
                    <a 
                      href={`https://wa.me/972${manager.phone.replace(/\D/g, '').startsWith('0') ? manager.phone.replace(/\D/g, '').slice(1) : manager.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center gap-2"
                    >
                      <MessageSquare size={18} />
                      דברי איתי בוואטסאפ
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Group Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main Group */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider">הקבוצה שלי</h2>
                <p className="text-emerald-600 font-black text-lg">{groupInfo.mainGroup?.name || 'טוען קבוצה...'}</p>
              </div>
            </div>
            {groupInfo.mainGroup?.link && (
              <a 
                href={groupInfo.mainGroup.link}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
              >
                <ExternalLink size={20} />
              </a>
            )}
          </div>

          {/* Observer Groups */}
          {groupInfo.observerGroups.length > 0 && (
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-3">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">קבוצות לצפייה</h2>
              <div className="flex flex-wrap gap-2">
                {groupInfo.observerGroups.map(group => (
                  <div key={group.id} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-2xl text-sm font-bold border border-slate-100">
                    <Eye size={14} className="text-slate-400" />
                    {group.name}
                    {group.link && (
                      <a href={group.link} target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-600">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Published Today Feed */}
        {publishedToday.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="text-amber-500" size={24} />
                פורסמו היום בקבוצה שלך
              </h2>
              <button 
                onClick={() => navigate('/portal/published-today')}
                className="text-emerald-500 font-bold text-sm"
              >
                צפה בהכל
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar">
              {publishedToday.map((log) => (
                <motion.div 
                  key={log.id}
                  whileHover={{ y: -5 }}
                  className="min-w-[280px] bg-white rounded-[2rem] overflow-hidden shadow-md border border-slate-100 snap-start"
                >
                  <div className="relative aspect-[4/5]">
                    <img 
                      src={log.match?.image_url || 'https://picsum.photos/seed/match/400/500'} 
                      alt={log.match?.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-4 right-4 left-4 text-white">
                      <h3 className="text-xl font-black">{log.match?.name}, {log.match?.age}</h3>
                      <p className="text-xs font-medium opacity-80">{log.match?.city}</p>
                      <p className="text-[10px] mt-1 opacity-60">פורסם ב-{new Date(log.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* My Profile Card Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <User className="text-emerald-500" size={24} />
              הכרטיס שלי
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('standard')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'standard' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                <Layout size={14} />
                רגיל
              </button>
              <button 
                onClick={() => setViewMode('designed')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'designed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                <Smartphone size={14} />
                מעוצב
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'standard' ? (
              <motion.div 
                key="standard"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100"
              >
                {myMatch ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-lg border border-slate-100">
                      <img 
                        src={myMatch.image_url || 'https://picsum.photos/seed/profile/600/800'} 
                        alt={myMatch.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-3xl font-black text-slate-900">{myMatch.name}</h3>
                        <p className="text-emerald-600 font-bold">{myMatch.age} • {myMatch.city}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">גובה</p>
                          <p className="font-bold text-slate-700">{myMatch.height}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">מצב משפחתי</p>
                          <p className="font-bold text-slate-700">{myMatch.marital_status}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">רמה דתית</p>
                          <p className="font-bold text-slate-700">{myMatch.religious_level}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">עיסוק</p>
                          <p className="font-bold text-slate-700 truncate">{myMatch.occupation}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">קצת עלי</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{myMatch.about || 'לא צוין'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-12">לא נמצא נתוני כרטיס</p>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="designed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div 
                  ref={cardRef}
                  className="bg-gradient-to-b from-[#0f172a] via-[#1e3a8a] to-[#fbbf24] p-0 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden aspect-[9/16] max-w-[320px] mx-auto border-4 border-white/20"
                >
                  {/* WhatsApp Style Header */}
                  <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/40 to-transparent z-10" />
                  
                  <div className="relative z-20 h-full flex flex-col">
                    {/* Profile Image - Large with rounded corners */}
                    <div className="mt-12 px-6">
                      <div className="aspect-square rounded-[2rem] overflow-hidden border-4 border-white/30 shadow-2xl">
                        <img 
                          src={myMatch?.image_url || 'https://picsum.photos/seed/profile/600/600'} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    <div className="flex-1 px-8 pt-8 space-y-8">
                      <div className="text-center">
                        <h3 className="text-4xl font-black mb-2 drop-shadow-lg">{myMatch?.name}</h3>
                        <div className="flex items-center justify-center gap-2 text-xl font-bold opacity-90">
                          <MapPin size={20} />
                          {myMatch?.age} • {myMatch?.city}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <TrendingUp size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase opacity-60">גובה</p>
                            <p className="font-bold text-lg">{myMatch?.height}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <Heart size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase opacity-60">מצב משפחתי</p>
                            <p className="font-bold text-lg">{myMatch?.marital_status}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <Shield size={20} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase opacity-60">רמה דתית</p>
                            <p className="font-bold text-lg">{myMatch?.religious_level}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 bg-black/20 backdrop-blur-xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                          <Heart className="text-white fill-white" size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black tracking-widest uppercase opacity-60">פורטל יוחאי</p>
                          <p className="text-xs font-black">משודך מאומת</p>
                        </div>
                      </div>
                      <Logo size={32} className="opacity-40" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button 
                    onClick={handleDownloadCard}
                    className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center gap-3"
                  >
                    <Download size={20} />
                    הורד כרטיס מעוצב
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Daily Suggestion */}
        <section className="space-y-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Star className="text-yellow-500" size={24} />
            הצעה יומית בשבילך
          </h2>
          {dailySuggestion ? (
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100"
            >
              <div className="relative aspect-[16/9] md:aspect-[21/9]">
                <img 
                  src={dailySuggestion.image_url || 'https://picsum.photos/seed/match/800/600'} 
                  alt={dailySuggestion.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 right-6 left-6 text-white">
                  <div className="inline-block px-3 py-1 bg-yellow-500 text-black text-[10px] font-black rounded-full mb-3 uppercase tracking-wider">
                    התאמה חכמה להיום
                  </div>
                  <h3 className="text-3xl font-black mb-1">{dailySuggestion.name}, {dailySuggestion.age}</h3>
                  <p className="text-sm font-medium opacity-90 flex items-center gap-2">
                    <TrendingUp size={14} />
                    {dailySuggestion.city} • {dailySuggestion.religious_level}
                  </p>
                </div>
              </div>
              <div className="p-6 flex items-center justify-between">
                <button 
                  onClick={() => navigate(`/match/${dailySuggestion.id}`)}
                  className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                >
                  צפייה בפרופיל המלא
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-2">
                  <button className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:text-red-500 transition-all border border-slate-100">
                    <Heart size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">ברוך הבא! בקרוב יופיעו כאן ההצעות שלך</p>
            </div>
          )}
        </section>

        {/* Quick Actions & Games */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Gamepad2 className="text-emerald-500" size={20} />
              משחקים פעילים
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => navigate('/portal/games')}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Layout size={24} />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-slate-900">משחק הזיכרון</h3>
                    <p className="text-xs text-slate-500 font-medium">מצא את הזוגות המתאימים</p>
                  </div>
                </div>
                <ChevronLeft size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </button>

              <button 
                onClick={() => navigate('/portal/games')}
                className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap size={24} />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-slate-900">מבוך שיתוף פעולה</h3>
                    <p className="text-xs text-slate-500 font-medium">עבדו יחד כדי לצאת מהמבוך</p>
                  </div>
                </div>
                <ChevronLeft size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} />
              פעולות מהירות
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => navigate('/portal/published-today')}
                className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-[2rem] text-white text-right space-y-3 shadow-lg shadow-orange-200 relative overflow-hidden group"
              >
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl">פורסמו היום</h3>
                  <p className="text-xs opacity-80 font-bold">הצעות חדשות מהשטח</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/portal/speed-date')}
                className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-[2rem] text-white text-right space-y-3 shadow-lg shadow-purple-200 relative overflow-hidden group"
              >
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="font-black text-xl">ספיד-דייט</h3>
                  <p className="text-xs opacity-80 font-bold">שיחה אנונימית של 7 דקות</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp View-Only Windows */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="text-emerald-500" size={20} />
              עדכוני קבוצות (צפייה בלבד)
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Group Window */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden h-[450px] relative flex flex-col">
              <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{groupInfo.mainGroup?.name || 'קבוצת הבית'}</h3>
                    <p className="text-[10px] opacity-80">קבוצת הבית שלך • צפייה בלבד</p>
                  </div>
                </div>
                {groupInfo.mainGroup?.link && (
                  <a href={groupInfo.mainGroup.link} target="_blank" rel="noreferrer" className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>

              <div className="flex-1 bg-[#e5ddd5] p-4 space-y-4 overflow-y-auto pb-24 scroll-smooth">
                <div className="flex justify-center">
                  <span className="bg-white/80 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm uppercase tracking-wider">היום</span>
                </div>
                
                {publishedToday.length > 0 ? (
                  publishedToday.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex flex-col items-start max-w-[85%]">
                      <div className="bg-white p-3 rounded-2xl rounded-tr-none shadow-sm space-y-2">
                        <p className="text-[10px] font-black text-emerald-600">מערכת הפורטל</p>
                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <img src={log.match?.image_url || ''} className="w-12 h-12 rounded-lg object-cover" alt="" referrerPolicy="no-referrer" />
                          <div>
                            <p className="text-xs font-black text-slate-900">{log.match?.name}, {log.match?.age}</p>
                            <p className="text-[10px] text-slate-500">{log.match?.city}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-800">כרטיס חדש פורסם בפורטל! מוזמנים להתרשם.</p>
                        <p className="text-[9px] text-slate-400 text-left">{new Date(log.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-start max-w-[80%]">
                    <div className="bg-white p-3 rounded-2xl rounded-tr-none shadow-sm space-y-1">
                      <p className="text-[10px] font-black text-emerald-600">מנהל הקבוצה</p>
                      <p className="text-sm text-slate-800">שלום לכולם! ברוכים הבאים לקבוצת הבית שלכם. כאן תקבלו עדכונים שוטפים.</p>
                      <p className="text-[9px] text-slate-400 text-left">09:00</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100">
                <div className="bg-slate-100 p-3 rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed">
                  <span className="text-sm text-slate-400 font-medium">אין לך הרשאה להקליד בקבוצה זו</span>
                  <Send size={18} className="text-slate-300" />
                </div>
              </div>
            </div>

            {/* Observer Groups Windows */}
            {groupInfo.observerGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden h-[450px] relative flex flex-col">
                <div className="bg-slate-700 p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Eye size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{group.name}</h3>
                      <p className="text-[10px] opacity-80">קבוצה לצפייה • צפייה בלבד</p>
                    </div>
                  </div>
                  {group.link && (
                    <a href={group.link} target="_blank" rel="noreferrer" className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all">
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>

                <div className="flex-1 bg-[#e5ddd5] p-4 space-y-4 overflow-y-auto pb-24">
                  <div className="flex justify-center">
                    <span className="bg-white/80 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 shadow-sm uppercase tracking-wider">היום</span>
                  </div>
                  
                  <div className="flex flex-col items-start max-w-[80%]">
                    <div className="bg-white p-3 rounded-2xl rounded-tr-none shadow-sm space-y-1">
                      <p className="text-[10px] font-black text-slate-600">מערכת</p>
                      <p className="text-sm text-slate-800">הנך מוגדר כצופה בקבוצה זו. תוכל לראות עדכונים אך לא להגיב.</p>
                      <p className="text-[9px] text-slate-400 text-left">08:00</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100">
                  <div className="bg-slate-100 p-3 rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed">
                    <span className="text-sm text-slate-400 font-medium">צפייה בלבד</span>
                    <Send size={18} className="text-slate-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Chat with Manager */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="text-emerald-500" size={20} />
            {manager?.gender === 'female' ? 'המנהלת שלי' : 'המנהל שלי'}
          </h2>
          <form onSubmit={handleSendMessage} className="relative">
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="כתוב הודעה למנהל האישי שלך..."
              className="w-full p-4 pr-4 pl-14 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 min-h-[100px] font-medium"
            />
            <button 
              type="submit"
              disabled={sending || !message.trim()}
              className="absolute bottom-4 left-4 w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </section>

        {/* Leaderboard Preview */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Trophy className="text-yellow-500" size={20} />
              טבלת המובילים
            </h2>
            <button 
              onClick={() => navigate('/portal/games')}
              className="text-emerald-500 font-bold text-sm"
            >
              צפה בהכל
            </button>
          </div>
          <div className="space-y-3">
            {leaderboard.slice(0, 3).map((score, index) => (
              <div key={score.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                    index === 0 ? 'bg-yellow-100 text-yellow-600' :
                    index === 1 ? 'bg-slate-200 text-slate-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-bold text-slate-700">{score.candidate_name}</span>
                </div>
                <span className="font-black text-emerald-600">{score.score} נק׳</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-center text-slate-400 py-4 font-medium">עדיין אין ניקוד. היה הראשון לשחק!</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Logo({ size = 32, className = "" }: { size?: number, className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-0 bg-emerald-500 rounded-xl rotate-6 opacity-20"></div>
        <div className="absolute inset-0 bg-emerald-600 rounded-xl -rotate-3 flex items-center justify-center shadow-lg">
          <Heart size={size * 0.6} className="text-white fill-white" />
        </div>
      </div>
    </div>
  );
}
