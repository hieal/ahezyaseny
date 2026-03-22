import React from 'react';
import { X, MessageSquare, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePresence } from '../contexts/PresenceContext';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';

export const OnlineMonitor = ({ isOpen, onClose, onOpenChat }: { isOpen: boolean, onClose: () => void, onOpenChat: (user: any) => void }) => {
  const { presenceState } = usePresence();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [allUsers, setAllUsers] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'online' | 'offline'>('all');

  React.useEffect(() => {
    if (authLoading || !currentUser || !isOpen) return;
    
    const fetchUsers = async () => {
      const users = await dataService.getUsers();
      // Filter for admins/super_admins/association_manager
      const admins = users.filter(u => u.role === 'admin' || u.role === 'super_admin' || u.role === 'association_manager');
      setAllUsers(admins);
    };
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [isOpen, authLoading, currentUser]);

  const filteredUsers = allUsers.filter(u => {
    const isOnline = !!presenceState[u.id] || (u.last_seen && new Date().getTime() - new Date(u.last_seen).getTime() < 5 * 60 * 1000);
    if (filter === 'online') return isOnline;
    if (filter === 'offline') return !isOnline;
    return true;
  });

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
              <h2 className="text-xl font-black">מנהלים מחוברים ({filteredUsers.length})</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>

            <div className="flex gap-2 bg-slate-100 p-1 rounded-full">
              {(['all', 'online', 'offline'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${
                    filter === f 
                      ? 'bg-[#22c55e] text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f === 'all' ? 'הכל' : f === 'online' ? 'מחוברים' : 'לא מחוברים'}
                </button>
              ))}
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[80vh]">
              {filteredUsers.map(user => {
                const isOnline = !!presenceState[user.id] || (user.last_seen && new Date().getTime() - new Date(user.last_seen).getTime() < 5 * 60 * 1000);
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {user.full_name?.[0] || 'מ'}
                      </div>
                      <span className="font-bold text-sm">{user.full_name}</span>
                    </div>
                    <div className="flex gap-2">
                      {user.phone && (
                        <a 
                          href={`https://wa.me/${user.phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                        >
                          <Phone size={18} />
                        </a>
                      )}
                      <button onClick={() => onOpenChat(user)} className="p-2 text-luxury-blue hover:bg-blue-50 rounded-full">
                        <MessageSquare size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
