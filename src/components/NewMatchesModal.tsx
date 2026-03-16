import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Match } from '../types';

interface Props {
  matches: Match[];
  onClose: () => void;
}

export default function NewMatchesModal({ matches, onClose }: Props) {
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 1);

  const newMatches = matches.filter(m => {
    if (!m.created_at) return false;
    const createdAt = new Date(m.created_at);
    return createdAt >= oneMonthAgo;
  }).sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

  const getWeekOfMonth = (date: Date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const day = date.getDate();
    const firstDayOfWeek = firstDayOfMonth.getDay();
    return Math.ceil((day + firstDayOfWeek) / 7);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">משודכים חדשים</h2>
              <p className="text-slate-500 font-medium">משודכים שהצטרפו בחודש האחרון</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {newMatches.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-bold">אין משודכים חדשים בחודש האחרון</div>
          ) : (
            <div className="space-y-4">
              {newMatches.map(match => {
                const createdAt = new Date(match.created_at!);
                const month = createdAt.toLocaleString('he-IL', { month: 'long' });
                const week = getWeekOfMonth(createdAt);
                return (
                  <div key={match.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                        {match.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{match.name}</p>
                        <p className="text-sm text-slate-500">{match.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">{month}</p>
                      <p className="text-sm text-slate-500">שבוע {week}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
