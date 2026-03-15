import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { SpeedDateSession } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Clock, Send, Shield, User, Heart, 
  X, MessageSquare, AlertCircle, CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function SpeedDate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SpeedDateSession | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [shared, setShared] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const checkActiveSession = async () => {
      const active = await dataService.getActiveSpeedDate(user.id);
      if (active) {
        setSession(active);
        const expiry = new Date(active.expires_at).getTime();
        const now = new Date().getTime();
        setTimeLeft(Math.max(0, Math.floor((expiry - now) / 1000)));
      }
    };

    checkActiveSession();
  }, [user]);

  useEffect(() => {
    if (!session) return;

    // Subscribe to messages
    const channel = supabase
      .channel(`speed-date-${session.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'candidate_chat_messages',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    // Fetch initial messages
    dataService.getChatMessages(session.id).then(setMessages);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  useEffect(() => {
    if (!session || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSessionEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session, timeLeft]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSessionEnd = async () => {
    if (session) {
      await dataService.updateSpeedDateStatus(session.id, 'expired');
      toast('הזמן נגמר! השיחה הסתיימה.', { icon: '⏰' });
    }
  };

  const startSearch = async () => {
    if (!user) return;
    setSearching(true);
    try {
      const newSession = await dataService.startSpeedDate(user.id, user.gender || 'male');
      if (newSession) {
        setSession(newSession);
        setTimeLeft(7 * 60);
        toast.success('מצאנו לך פרטנר! השיחה מתחילה עכשיו.');
      } else {
        toast.error('לא נמצאו משתמשים פנויים כרגע. נסה שוב בעוד כמה דקות.');
      }
    } catch (err) {
      toast.error('שגיאה בחיפוש פרטנר');
    } finally {
      setSearching(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session || !user) return;

    try {
      await dataService.sendChatMessage(session.id, user.id, newMessage);
      setNewMessage('');
    } catch (err) {
      toast.error('שגיאה בשליחת ההודעה');
    }
  };

  const handleShareDetails = async () => {
    if (!session || !user) return;
    try {
      const isMale = user.gender === 'male';
      await dataService.updateSpeedDateStatus(session.id, 'active', {
        [isMale ? 'male' : 'female']: true
      });
      setShared(true);
      toast.success('הפרטים שלך ישותפו עם המנהל בסיום השיחה');
    } catch (err) {
      toast.error('שגיאה בשיתוף פרטים');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="relative">
            <div className="w-24 h-24 bg-purple-100 text-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Zap size={48} fill="currentColor" />
            </div>
            {searching && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900">ספיד-דייט אנונימי</h1>
            <p className="text-slate-500 font-medium">
              שיחה אקראית של 7 דקות עם משודך/ת מהצד השני.
              בסיום השיחה תוכלו לבחור אם לשתף פרטים עם המנהלים.
            </p>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 text-right">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">פרטיות מלאה</h3>
                <p className="text-xs text-slate-500">השיחה אנונימית לחלוטין. אף אחד לא רואה את השם או התמונה שלך.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">7 דקות בלבד</h3>
                <p className="text-xs text-slate-500">זמן קצר להתרשמות ראשונית ללא מחויבות.</p>
              </div>
            </div>
          </div>

          <button
            onClick={startSearch}
            disabled={searching}
            className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-purple-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {searching ? 'מחפש פרטנר...' : 'התחל חיפוש'}
          </button>

          <button 
            onClick={() => navigate('/portal')}
            className="text-slate-400 font-bold hover:text-slate-600 transition-colors"
          >
            חזרה ללוח הבקרה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
              <User size={24} />
            </div>
            <div>
              <h2 className="font-black text-slate-900">שיחה אנונימית</h2>
              <div className="flex items-center gap-1.5 text-emerald-500">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">מחובר</span>
              </div>
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-2xl font-black flex items-center gap-2 ${
            timeLeft < 60 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-600'
          }`}>
            <Clock size={18} />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
        <div className="text-center py-8 space-y-2">
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mx-auto">
            <Heart size={24} />
          </div>
          <p className="text-sm text-slate-400 font-bold">השיחה התחילה! תהיו נחמדים :)</p>
        </div>

        {messages.map((msg, index) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id || index}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-4 rounded-3xl font-medium ${
                isMe 
                  ? 'bg-emerald-500 text-white rounded-br-none' 
                  : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          );
        })}
        <div ref={chatEndRef} />
      </main>

      {/* Footer / Input */}
      <footer className="bg-white border-t border-slate-200 p-4 pb-8">
        <div className="max-w-2xl mx-auto space-y-4">
          {timeLeft > 0 && (
            <form onSubmit={sendMessage} className="relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="הקלד הודעה..."
                className="w-full p-4 pr-4 pl-14 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="absolute bottom-2 left-2 w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          )}

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleShareDetails}
              disabled={shared || timeLeft <= 0}
              className={`flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                shared 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'
              }`}
            >
              {shared ? <CheckCircle2 size={18} /> : <Heart size={18} />}
              {shared ? 'פרטים ישותפו' : 'מעוניין/ת להכיר?'}
            </button>
            
            <button
              onClick={() => {
                if (window.confirm('האם אתה בטוח שברצונך לסיים את השיחה?')) {
                  handleSessionEnd();
                  navigate('/portal');
                }
              }}
              className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
