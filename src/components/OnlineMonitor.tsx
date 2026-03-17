import React from 'react';
import { X, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';

export const OnlineMonitor = ({ isOpen, onClose, onOpenChat }: { isOpen: boolean, onClose: () => void, onOpenChat: (user: any) => void }) => {
  const [onlineUsers, setOnlineUsers] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchOnlineUsers = async () => {
      const users = await dataService.getUsers();
      setOnlineUsers(users.filter(u => u.is_online));
    };
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" onClick={onClose} />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[101] p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">מחוברים כעת</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {onlineUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                        {user.full_name?.[0] || 'מ'}
                    </div>
                    <span className="font-bold text-sm">{user.full_name}</span>
                  </div>
                  {user.role !== 'candidate' && (
                    <button onClick={() => onOpenChat(user)} className="p-2 text-luxury-blue hover:bg-blue-50 rounded-full">
                      <MessageSquare size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
