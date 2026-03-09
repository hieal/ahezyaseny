import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { User } from '../types';
import { Users, Phone, MessageSquare, User as UserIcon, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { InternalChat } from '../components/InternalChat';

export default function ConnectedAdmins() {
  const { user } = useAuth();
  const [allAdmins, setAllAdmins] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState<{id: string, name: string} | null>(null);
  const [showList, setShowList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAdmins = async () => {
    try {
      let data = await dataService.getUsers();
      
      // Filter for team leaders: only show admins they created
      if (user && user.role === 'team_leader') {
        data = data.filter(a => a.created_by === user.id || a.id === user.id);
      }
      
      setAllAdmins(data);
      
      const now = new Date().getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      const online = data.filter(a => {
        if (!a.last_seen || !a.is_online) return false;
        const lastSeen = new Date(a.last_seen).getTime();
        return (now - lastSeen) < fiveMinutes;
      }).map(a => a.id);
      
      setOnlineUsers(online);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    const interval = setInterval(fetchAdmins, 15000); // Refresh every 15 seconds for more real-time
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const onlineMales = allAdmins.filter(a => onlineUsers.includes(a.id) && a.gender === 'male').length;
  const onlineFemales = allAdmins.filter(a => onlineUsers.includes(a.id) && a.gender === 'female').length;

  const filteredAdmins = allAdmins
    .filter(a => a.id !== user?.id)
    .filter(a => a.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aOnline = onlineUsers.includes(a.id);
      const bOnline = onlineUsers.includes(b.id);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      return 0;
    });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Users className="text-luxury-blue" size={32} />
            מנהלים מחוברים
          </h1>
          <p className="text-slate-500 mt-2 font-medium">צפה במנהלים המחוברים כעת למערכת וצור איתם קשר</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-sm font-bold text-slate-600 mr-2">הצג רשימה</span>
          <button 
            onClick={() => setShowList(!showList)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showList ? 'bg-luxury-blue' : 'bg-slate-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showList ? '-translate-x-6' : '-translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center justify-between"
        >
          <div>
            <p className="text-sm text-blue-600 font-black uppercase tracking-wider mb-1">בנים מחוברים</p>
            <p className="text-5xl font-black text-blue-900">{onlineMales}</p>
          </div>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
            <UserIcon size={32} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-pink-50 p-6 rounded-3xl border border-pink-100 flex items-center justify-between"
        >
          <div>
            <p className="text-sm text-pink-600 font-black uppercase tracking-wider mb-1">בנות מחוברות</p>
            <p className="text-5xl font-black text-pink-900">{onlineFemales}</p>
          </div>
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-pink-500">
            <UserIcon size={32} />
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showList && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-800">רשימת מנהלים</h2>
              <div className="relative w-full md:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="חפש מנהל..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-luxury-blue outline-none text-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-500 text-sm">
                  <tr>
                    <th className="px-6 py-4 font-bold">שם המנהל</th>
                    <th className="px-6 py-4 font-bold">תפקיד</th>
                    <th className="px-6 py-4 font-bold">סטטוס</th>
                    <th className="px-6 py-4 font-bold">נראה לאחרונה</th>
                    <th className="px-6 py-4 font-bold text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdmins.map(admin => {
                    const isOnline = onlineUsers.includes(admin.id);
                    return (
                      <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {admin.avatar_url ? (
                                <img src={admin.avatar_url} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                  <UserIcon size={20} />
                                </div>
                              )}
                              {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
                            </div>
                            <div className="font-bold text-slate-900">{admin.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {admin.role === 'super_admin' ? 'מנהל ראשי' : admin.role === 'team_leader' ? 'ראש צוות' : 'מנהל'}
                        </td>
                        <td className="px-6 py-4">
                          {isOnline ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                              מחובר כעת
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                              לא מחובר
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">
                          {isOnline ? 'עכשיו' : (admin.last_seen ? new Date(admin.last_seen).toLocaleString('he-IL') : 'לא ידוע')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => admin.phone ? window.open(`https://wa.me/${admin.phone.replace(/\D/g, '')}`) : toast.error('אין מספר טלפון')} 
                              className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-colors" 
                              title="שלח וואטסאפ"
                            >
                              <Phone size={20} />
                            </button>
                            <button 
                              onClick={() => setShowChat({ id: admin.id, name: admin.name })} 
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors" 
                              title="שלח הודעת צ'אט"
                            >
                              <MessageSquare size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAdmins.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                        {searchTerm ? 'לא נמצאו מנהלים התואמים את החיפוש' : 'אין מנהלים אחרים במערכת'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Internal Chat */}
      <AnimatePresence>
        {showChat && (
          <InternalChat 
            otherUser={showChat} 
            onClose={() => setShowChat(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
