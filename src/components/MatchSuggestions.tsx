import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, ArrowLeftRight, User, Heart, RefreshCw, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Match } from '../types';
import { toast } from 'react-hot-toast';
import { dataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';

interface Suggestion {
  match: Match;
  potentialMatches: Match[];
}

export const MatchSuggestions: React.FC = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardsToShow, setCardsToShow] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);

  // Calculate time until next midnight
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
      setTimeLeft(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fetchSuggestions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const allMatches = await dataService.getMatches();
      const myMatchesList = allMatches.filter(m => m.created_by === user.id);
      const otherMatches = allMatches.filter(m => m.created_by !== user.id);

      if (myMatchesList.length === 0 || otherMatches.length === 0) {
        setSuggestions([]);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const hash = (s: string) => s.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
      const dateShift = Math.abs(hash(today));

      const maleMatches = allMatches.filter(m => m.type === 'male').sort((a, b) => a.id.localeCompare(b.id));
      const femaleMatches = allMatches.filter(m => m.type === 'female').sort((a, b) => a.id.localeCompare(b.id));

      const dailySuggestions: Suggestion[] = [];
      const mySortedMatches = [...myMatchesList].sort((a, b) => a.id.localeCompare(b.id));
      
      // Generate up to 3 source matches
      for (let i = 0; i < Math.min(3, mySortedMatches.length); i++) {
        const myMatchIdx = (dateShift + i) % mySortedMatches.length;
        const myMatch = mySortedMatches[myMatchIdx];
        
        let partner: Match | null = null;
        if (myMatch.type === 'male') {
          const myGlobalIdx = maleMatches.findIndex(m => m.id === myMatch.id);
          if (myGlobalIdx !== -1 && femaleMatches.length > 0) {
            const partnerIdx = (myGlobalIdx + dateShift) % femaleMatches.length;
            partner = femaleMatches[partnerIdx];
          }
        } else {
          const myGlobalIdx = femaleMatches.findIndex(m => m.id === myMatch.id);
          if (myGlobalIdx !== -1 && maleMatches.length > 0) {
            const partnerIdx = (myGlobalIdx - (dateShift % maleMatches.length) + maleMatches.length) % maleMatches.length;
            partner = maleMatches[partnerIdx];
          }
        }

        if (partner) {
          dailySuggestions.push({
            match: myMatch,
            potentialMatches: [partner]
          });
        }
      }

      setSuggestions(dailySuggestions);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [user?.id]);

  if (loading) return (
    <div className="bg-white rounded-3xl p-8 flex flex-col items-center justify-center space-y-4 border border-slate-100 shadow-sm">
      <div className="w-10 h-10 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-bold text-sm">מחשב התאמות חכמות...</p>
    </div>
  );

  if (suggestions.length === 0) return (
    <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
          <Sparkles size={24} />
        </div>
        <p className="text-slate-500 font-bold">אין מספיק נתונים להצעות יומיות כרגע.</p>
        <div className="flex items-center gap-2 text-xs text-luxury-blue font-bold bg-blue-50 px-4 py-2 rounded-full">
          <Clock size={14} />
          <span>הצעה חדשה בעוד: {formatTime(timeLeft)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-luxury-blue/10 flex items-center justify-center text-luxury-blue shadow-sm">
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">הצעות יומיות חכמות עבורך</h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
              <Clock size={12} className="text-luxury-blue" />
              <span>הצעה חדשה בעוד: {formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pr-2">כמות הצעות:</span>
          <div className="flex gap-1">
            {[1, 2, 3].map(num => (
              <button
                key={num}
                onClick={() => setCardsToShow(num)}
                className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                  cardsToShow === num 
                    ? 'bg-luxury-blue text-white shadow-md' 
                    : 'bg-white text-slate-400 hover:text-luxury-blue border border-slate-100'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4`}>
        {suggestions.slice(0, cardsToShow).map((suggestion, sIdx) => (
          <motion.div 
            key={suggestion.match.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gradient-to-br from-white to-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
              <Sparkles size={150} />
            </div>

            {/* Source Match */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="flex items-center gap-4 p-4 bg-white rounded-3xl shadow-sm border border-slate-100 relative z-10">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border-2 border-luxury-blue/10">
                  {suggestion.match.image_url ? (
                    <img src={dataService.getPublicImageUrl(suggestion.match.image_url)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <User size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900">{suggestion.match.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{suggestion.match.age} • {suggestion.match.city}</p>
                  <div className="mt-1 inline-block px-2 py-0.5 bg-blue-50 text-luxury-blue rounded-full text-[9px] font-black uppercase tracking-wider">
                    המשודך שלך
                  </div>
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="lg:col-span-2 flex items-center justify-center py-2 lg:py-0">
              <div className="h-px lg:h-12 w-12 lg:w-px bg-gradient-to-r lg:bg-gradient-to-b from-transparent via-slate-200 to-transparent relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-sm border border-slate-100 text-slate-400">
                  <ArrowLeftRight size={16} />
                </div>
              </div>
            </div>

            {/* Potential Match */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              {suggestion.potentialMatches.map((pm) => (
                <div 
                  key={pm.id}
                  className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-2xl hover:shadow-lg transition-all border border-white group/item cursor-pointer shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                    {pm.image_url ? (
                      <img src={dataService.getPublicImageUrl(pm.image_url)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <User size={18} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">{pm.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{pm.age} • {pm.city}</p>
                    <p className="text-[9px] text-luxury-blue font-bold mt-0.5 truncate">מנהל: {pm.creator_name || 'אחר'}</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.success('ההצעה נשמרה במועדפים');
                    }}
                    className="p-2 bg-pink-50 text-pink-500 rounded-xl opacity-0 group-hover/item:opacity-100 transition-all hover:bg-pink-100 shadow-sm"
                  >
                    <Heart size={16} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
