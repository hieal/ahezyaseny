import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { Match, GameScore } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, MessageSquare, Users, Trophy, Gamepad2, 
  Zap, Clock, Send, ChevronLeft, Star, TrendingUp,
  User, Shield, LogOut
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function CandidateDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dailySuggestion, setDailySuggestion] = useState<Match | null>(null);
  const [onlineStats, setOnlineStats] = useState({ males: 0, females: 0 });
  const [leaderboard, setLeaderboard] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [suggestion, stats, topScores] = await Promise.all([
          dataService.getDailySuggestion(user.category || '', user.gender || 'male'),
          dataService.getOnlineStats(),
          dataService.getLeaderboard()
        ]);
        setDailySuggestion(suggestion);
        setOnlineStats(stats);
        setLeaderboard(topScores);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    
    setSending(true);
    try {
      // Send message to their manager (created_by)
      if (user.created_by) {
        await dataService.sendInternalMessage({
          sender_id: user.id,
          sender_name: user.name,
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
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              {user?.name?.[0]}
            </div>
            <div>
              <h1 className="font-bold text-slate-900">שלום, {user?.name}</h1>
              <p className="text-xs text-slate-500 font-medium">פורטל המשודכים</p>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Online Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">בנים אונליין</p>
              <p className="text-2xl font-black text-slate-900">{onlineStats.males}</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">בנות אונליין</p>
              <p className="text-2xl font-black text-slate-900">{onlineStats.females}</p>
            </div>
          </div>
        </div>

        {/* Daily Suggestion */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Star className="text-yellow-500" size={20} />
            הצעה יומית בשבילך
          </h2>
          {dailySuggestion ? (
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100"
            >
              <div className="relative aspect-[4/3]">
                <img 
                  src={dailySuggestion.image_url || 'https://picsum.photos/seed/match/800/600'} 
                  alt={dailySuggestion.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 right-6 left-6 text-white">
                  <h3 className="text-2xl font-black mb-1">{dailySuggestion.name}, {dailySuggestion.age}</h3>
                  <p className="text-sm font-medium opacity-90 flex items-center gap-2">
                    <TrendingUp size={14} />
                    {dailySuggestion.city} • {dailySuggestion.religious_level}
                  </p>
                </div>
              </div>
              <div className="p-6 flex items-center justify-between">
                <button 
                  onClick={() => navigate(`/match/${dailySuggestion.id}`)}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                  צפייה בפרופיל המלא
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-2">
                  <button className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:text-red-500 transition-all">
                    <Heart size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white p-12 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">אין הצעות חדשות כרגע. נסה שוב מאוחר יותר!</p>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/speed-date')}
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

          <button 
            onClick={() => navigate('/games')}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[2rem] text-white text-right space-y-3 shadow-lg shadow-emerald-200 relative overflow-hidden group"
          >
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Gamepad2 size={24} />
            </div>
            <div>
              <h3 className="font-black text-xl">אזור המשחקים</h3>
              <p className="text-xs opacity-80 font-bold">שחק וצבור נקודות</p>
            </div>
          </button>
        </div>

        {/* Chat with Manager */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="text-emerald-500" size={20} />
            הודעה מהירה למנהל
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
              onClick={() => navigate('/games')}
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
