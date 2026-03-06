import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeftRight, User, Heart, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Match } from '../types';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Suggestion {
  match: Match;
  potentialMatches: Match[];
}

export const MatchSuggestions: React.FC = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchSuggestions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get 3 random matches of the current user
      const { data: myMatches } = await supabase
        .from("matches")
        .select("*")
        .eq("created_by", user.id)
        .is("deleted_at", null)
        .limit(3);
      
      if (!myMatches || myMatches.length === 0) {
        setSuggestions([]);
        return;
      }

      const newSuggestions: Suggestion[] = [];
      for (const match of myMatches) {
        const oppositeGender = match.type === 'male' ? 'female' : 'male';
        const { data: potentialMatches } = await supabase
          .from("matches")
          .select("*")
          .eq("type", oppositeGender)
          .is("deleted_at", null)
          .limit(5);
        
        newSuggestions.push({
          match,
          potentialMatches: potentialMatches || []
        });
      }
      setSuggestions(newSuggestions);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [user]);

  if (loading) return (
    <div className="card p-8 flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-bold">מחפש התאמות פוטנציאליות...</p>
    </div>
  );

  if (suggestions.length === 0) return null;

  const current = suggestions[currentIndex];

  return (
    <div className="card p-6 border-none shadow-xl bg-gradient-to-br from-white to-blue-50/30 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <Sparkles size={120} />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-luxury-blue/10 flex items-center justify-center text-luxury-blue">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">הצעות להתאמה</h2>
            <p className="text-xs text-slate-500 font-bold">הצעות יומיות חכמות עבורך</p>
          </div>
        </div>
        <button 
          onClick={fetchSuggestions}
          className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-luxury-blue shadow-sm"
          title="רענן הצעות"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md">
            {current.match.image_url ? (
              <img src={current.match.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                <User size={24} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-slate-900">{current.match.name}</p>
            <p className="text-xs text-slate-500 font-bold">{current.match.age} • {current.match.city}</p>
          </div>
          <div className="px-3 py-1 bg-blue-50 text-luxury-blue rounded-full text-[10px] font-black uppercase tracking-wider">
            המשודך שלך
          </div>
        </div>

        <div className="flex items-center justify-center py-2">
          <div className="h-px flex-1 bg-slate-100"></div>
          <div className="px-4 text-slate-300">
            <ArrowLeftRight size={20} />
          </div>
          <div className="h-px flex-1 bg-slate-100"></div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">התאמות מוצעות:</p>
          <div className="grid grid-cols-1 gap-3">
            {current.potentialMatches.map((pm, idx) => (
              <motion.div 
                key={pm.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-3 p-3 bg-white rounded-2xl hover:shadow-md transition-all border border-slate-50 group/item cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
                  {pm.image_url ? (
                    <img src={pm.image_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User size={18} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">{pm.name}</p>
                  <p className="text-[10px] text-slate-500">{pm.age} • {pm.city}</p>
                </div>
                <button 
                  onClick={() => toast.success('ההצעה נשמרה')}
                  className="p-2 bg-pink-50 text-pink-500 rounded-xl opacity-0 group-hover/item:opacity-100 transition-all hover:bg-pink-100"
                >
                  <Heart size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        {suggestions.map((_, idx) => (
          <button 
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all ${currentIndex === idx ? 'bg-luxury-blue w-6' : 'bg-slate-200'}`}
          />
        ))}
      </div>
    </div>
  );
};
