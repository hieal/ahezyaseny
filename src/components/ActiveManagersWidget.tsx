import React, { useState } from 'react';
import { usePresence } from '../contexts/PresenceContext';
import { useAuth } from '../contexts/AuthContext';
import { Send, Users, X, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export const ActiveManagersWidget: React.FC = () => {
  const { user } = useAuth();
  const { presenceState } = usePresence();
  const [showModal, setShowModal] = useState(false);
  const [isCarouselMode, setIsCarouselMode] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  if (!user || (user.role !== 'super_admin' && user.role !== 'super_observer')) {
    return null;
  }

  const onlineUsers = Object.values(presenceState).filter(p => p.user_id !== user.id);
  const isMalachi = user.phone === '0556603336';

  const nextManager = () => setCarouselIndex((prev) => (prev + 1) % onlineUsers.length);
  const prevManager = () => setCarouselIndex((prev) => (prev - 1 + onlineUsers.length) % onlineUsers.length);

  return (
    <>
      <div className="mt-6 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 h-[200px] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            מנהלים בפעילות כעת
          </h3>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          {isCarouselMode ? (
            <div className="h-full flex items-center justify-center">
              {onlineUsers.length > 0 ? (
                <div className="flex items-center gap-2 w-full">
                  <button onClick={prevManager} className="p-1 hover:bg-emerald-500/20 rounded-full text-emerald-700"><ChevronRight size={16}/></button>
                  <div className="flex-1 text-center text-emerald-900 text-xs font-bold">
                    {onlineUsers[carouselIndex].full_name}
                  </div>
                  <button onClick={nextManager} className="p-1 hover:bg-emerald-500/20 rounded-full text-emerald-700"><ChevronLeft size={16}/></button>
                </div>
              ) : (
                <p className="text-emerald-700/60 text-xs italic">אין מנהלים פעילים</p>
              )}
            </div>
          ) : (
            <div className="space-y-3 h-full overflow-y-auto custom-scrollbar pr-1">
              {onlineUsers.slice(0, 3).map(manager => (
                <div key={manager.user_id} className="flex items-center justify-between text-emerald-900 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                    <span className="truncate max-w-[120px]">{manager.full_name}</span>
                  </div>
                  {isMalachi && (
                    <button onClick={() => toast.success(`התראה נשלחה ל-${manager.full_name}`)} className="p-1 hover:bg-emerald-500/20 rounded-md transition-colors">
                      <Send size={12} className="text-emerald-700" />
                    </button>
                  )}
                </div>
              ))}
              {onlineUsers.length === 0 && <p className="text-emerald-700/60 text-xs text-center italic">אין מנהלים פעילים כעת</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 shrink-0">
          <button 
            onClick={() => setShowModal(true)}
            className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <Users size={12} /> הצג עוד
          </button>
          <button 
            onClick={() => setIsCarouselMode(!isCarouselMode)}
            className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <LayoutGrid size={12} /> {isCarouselMode ? 'תצוגה רגילה' : 'מצב גלילה'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">כל המנהלים המחוברים</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {onlineUsers.map(manager => (
                  <div key={manager.user_id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="font-bold text-emerald-900">{manager.full_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
