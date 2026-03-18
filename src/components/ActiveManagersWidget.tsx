import React, { useState } from 'react';
import { usePresence } from '../contexts/PresenceContext';
import { useAuth } from '../contexts/AuthContext';
import { Send, Users, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export const ActiveManagersWidget: React.FC = () => {
  const { user } = useAuth();
  const { presenceState } = usePresence();
  const [showModal, setShowModal] = useState(false);

  if (!user || (user.role !== 'super_admin' && user.role !== 'super_observer')) {
    return null;
  }

  const onlineUsers = Object.values(presenceState).filter(p => p.user_id !== user.id);
  const displayUsers = onlineUsers.slice(0, 3);
  const hasMore = onlineUsers.length > 3;
  const isMalachi = user.username === 'god';

  return (
    <>
      <div className="mt-6 p-4 bg-slate-900 rounded-2xl border border-slate-800 h-[200px] flex flex-col">
        <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
          מנהלים בפעילות כעת
        </h3>
        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
          {displayUsers.map(manager => (
            <div key={manager.user_id} className="flex items-center justify-between text-slate-300 text-xs">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>
                <span className="truncate max-w-[120px]">{manager.full_name}</span>
              </div>
              {isMalachi && (
                <button 
                  onClick={() => toast.success(`התראה נשלחה ל-${manager.full_name}`)}
                  className="p-1 hover:bg-slate-700 rounded-md transition-colors"
                  title="שלח התראה"
                >
                  <Send size={12} className="text-[#D4AF37]" />
                </button>
              )}
            </div>
          ))}
          {onlineUsers.length === 0 && (
            <p className="text-slate-500 text-xs text-center italic">אין מנהלים פעילים כעת</p>
          )}
        </div>
        {hasMore && (
          <button 
            onClick={() => setShowModal(true)}
            className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 text-[#D4AF37] text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Users size={12} />
            הצג עוד {onlineUsers.length - 3} מנהלים
          </button>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">כל המנהלים המחוברים</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {onlineUsers.map(manager => (
                  <div key={manager.user_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="font-bold text-slate-900">{manager.full_name}</span>
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
