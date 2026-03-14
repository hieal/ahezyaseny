import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { User } from '../types';
import { Users, Phone, MessageSquare, User as UserIcon, Search, CheckCircle, Filter, ChevronDown, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useChat } from '../contexts/ChatContext';
import { usePresence } from '../contexts/PresenceContext';
import { OnlineIndicator } from '../components/OnlineIndicator';
import { CATEGORIES } from '../constants';

export default function ConnectedAdmins() {
  const { user } = useAuth();
  const { openChat } = useChat();
  const { presenceState } = usePresence();
  const [allAdmins, setAllAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [autoPopup, setAutoPopup] = useState(() => {
    return localStorage.getItem('chat_auto_popup') !== 'false';
  });
  const [multiChatMode, setMultiChatMode] = useState(() => {
    return localStorage.getItem('multi_chat_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('chat_auto_popup', autoPopup.toString());
    window.dispatchEvent(new Event('storage')); 
  }, [autoPopup]);

  useEffect(() => {
    localStorage.setItem('multi_chat_mode', multiChatMode.toString());
    window.dispatchEvent(new Event('storage'));
  }, [multiChatMode]);

  const fetchAdmins = async () => {
    try {
      const data = await dataService.getUsers();
      console.log('Fetched admins count:', data.length);
      setAllAdmins(data);
    } catch (err: any) {
      console.error('CRITICAL: Failed to fetch admins in ConnectedAdmins.tsx:', err.message || err);
      toast.error('שגיאה בטעינת מנהלים. בדוק את ה-Console לפרטים.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const onlineAdmins = allAdmins.filter(a => !!presenceState[a.id]);
  const onlineMales = onlineAdmins.filter(a => a.gender === 'male').length;
  const onlineFemales = onlineAdmins.filter(a => a.gender === 'female').length;

  const filteredAdmins = allAdmins
    .filter(a => {
      // Manager Unification logic
      const isSuperAdmin = user?.role === 'super_admin';
      const isTeamLeader = user?.role === 'team_leader';
      const isSameCategory = user?.category && (a.category === user.category || a.secondary_category === user.category);
      const isCreator = a.created_by === user?.id;
      const isSelf = a.id === user?.id;
      const isAdminRole = a.role === 'admin' || a.role === 'super_admin';

      if (!isSuperAdmin) {
        if (isAdminRole) return true;
        
        if (isTeamLeader) {
          if (!isSameCategory && !isCreator && !isSelf) return false;
        } else {
          if (!isSameCategory && !isSelf) return false;
        }
      }

      const matchesSearch = a.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const isOnline = !!presenceState[a.id];
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'online' ? isOnline : !isOnline);
      const matchesGender = genderFilter === 'all' || a.gender === genderFilter;
      const matchesGroup = groupFilter === 'all' || a.category === groupFilter || a.secondary_category === groupFilter;
      const matchesSpecificAdmin = !selectedAdminId || a.id === selectedAdminId;
      
      return matchesSearch && matchesStatus && matchesGender && matchesGroup && matchesSpecificAdmin;
    })
    .sort((a, b) => {
      // Admin/SuperAdmin first
      const aIsAdmin = a.role === 'admin' || a.role === 'super_admin';
      const bIsAdmin = b.role === 'admin' || b.role === 'super_admin';
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;

      // Then Online
      const aOnline = !!presenceState[a.id];
      const bOnline = !!presenceState[b.id];
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
            מנהלים מחוברים ({Object.keys(presenceState).length})
          </h1>
          <p className="text-slate-500 mt-2 font-medium">צפה במנהלים המחוברים כעת למערכת וצור איתם קשר</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-purple-600" />
              <span className="text-sm font-bold text-slate-600">ריבוי חלונות צ'אט</span>
            </div>
            <button 
              onClick={() => setMultiChatMode(!multiChatMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${multiChatMode ? 'bg-purple-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${multiChatMode ? '-translate-x-6' : '-translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-luxury-blue" />
              <span className="text-sm font-bold text-slate-600">צ'אט קופץ אוטומטי</span>
            </div>
            <button 
              onClick={() => setAutoPopup(!autoPopup)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoPopup ? 'bg-luxury-blue' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoPopup ? '-translate-x-6' : '-translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center gap-4 bg-white p-2 px-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-sm font-bold text-slate-600">הצג רשימה</span>
            <button 
              onClick={() => setShowList(!showList)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showList ? 'bg-luxury-blue' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showList ? '-translate-x-6' : '-translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setGenderFilter(genderFilter === 'male' ? 'all' : 'male')}
        >
          <div>
            <p className="text-sm text-blue-600 font-black uppercase tracking-wider mb-1">בנים מחוברים</p>
            <p className="text-5xl font-black text-blue-900">{onlineMales}</p>
            {genderFilter === 'male' && <span className="text-xs font-bold text-blue-600">מסונן לפי בנים</span>}
          </div>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
            <UserIcon size={32} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-pink-50 p-6 rounded-3xl border border-pink-100 flex items-center justify-between cursor-pointer hover:bg-pink-100 transition-colors"
          onClick={() => setGenderFilter(genderFilter === 'female' ? 'all' : 'female')}
        >
          <div>
            <p className="text-sm text-pink-600 font-black uppercase tracking-wider mb-1">בנות מחוברות</p>
            <p className="text-5xl font-black text-pink-900">{onlineFemales}</p>
            {genderFilter === 'female' && <span className="text-xs font-bold text-pink-600">מסונן לפי בנות</span>}
          </div>
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-pink-500">
            <UserIcon size={32} />
          </div>
        </motion.div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="space-y-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">סטטוס חיבור</p>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
              <button 
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
              >
                הכל
              </button>
              <button 
                onClick={() => setStatusFilter('online')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusFilter === 'online' ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
              >
                מחוברים
              </button>
              <button 
                onClick={() => setStatusFilter('offline')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusFilter === 'offline' ? 'bg-slate-400 text-white shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
              >
                לא מחוברים
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">סינון קבוצה</p>
            <div className="relative">
              <button 
                onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all min-w-[160px] justify-between"
              >
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-luxury-blue" />
                  {groupFilter === 'all' ? 'כל הקבוצות' : groupFilter}
                </div>
                <ChevronDown size={16} className={`transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {showGroupDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowGroupDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden"
                    >
                      <button 
                        onClick={() => {
                          setGroupFilter('all');
                          setSelectedAdminId(null);
                          setShowGroupDropdown(false);
                        }}
                        className="w-full text-right px-4 py-3 text-sm font-bold hover:bg-slate-50 transition-colors border-b border-slate-50"
                      >
                        כל הקבוצות
                      </button>
                      {CATEGORIES.map(cat => (
                        <button 
                          key={cat}
                          onClick={() => {
                            setGroupFilter(cat);
                            setSelectedAdminId(null);
                            setShowGroupDropdown(false);
                          }}
                          className={`w-full text-right px-4 py-3 text-sm font-bold hover:bg-slate-50 transition-colors ${groupFilter === cat ? 'text-luxury-blue bg-blue-50/50' : 'text-slate-600'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {groupFilter !== 'all' && (
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">בחר מנהל ספציפי</p>
              <div className="relative">
                <button 
                  onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all min-w-[200px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-luxury-blue" />
                    {selectedAdminId ? allAdmins.find(a => a.id === selectedAdminId)?.name : 'כל המנהלים בקבוצה'}
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${showAdminDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showAdminDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowAdminDropdown(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden max-h-64 overflow-y-auto"
                      >
                        <button 
                          onClick={() => {
                            setSelectedAdminId(null);
                            setShowAdminDropdown(false);
                          }}
                          className="w-full text-right px-4 py-3 text-sm font-bold hover:bg-slate-50 transition-colors border-b border-slate-50"
                        >
                          כל המנהלים בקבוצה
                        </button>
                        {allAdmins
                          .filter(a => a.category === groupFilter || a.secondary_category === groupFilter)
                          .map(admin => (
                            <button 
                              key={admin.id}
                              onClick={() => {
                                setSelectedAdminId(admin.id);
                                setShowAdminDropdown(false);
                              }}
                              className={`w-full text-right px-4 py-3 text-sm font-bold hover:bg-slate-50 transition-colors ${selectedAdminId === admin.id ? 'text-luxury-blue bg-blue-50/50' : 'text-slate-600'}`}
                            >
                              {admin.name}
                            </button>
                          ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
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
                    const isOnline = !!presenceState[admin.id];
                    return (
                      <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {admin.avatar_url ? (
                                <div className="relative">
                                  <img src={dataService.getPublicImageUrl(admin.avatar_url)} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                                  {admin.avatar_url.includes('supabase.co') && (
                                    <div className="absolute -top-1 -right-1 bg-green-500 text-white p-0.5 rounded-full border border-white shadow-sm" title="תמונה מסונכרנת">
                                      <CheckCircle size={10} />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                  <UserIcon size={20} />
                                </div>
                              )}
                              {isOnline && <OnlineIndicator isOnline={true} className="absolute bottom-0 right-0" />}
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
                            {admin.role !== 'super_admin' && (
                              <button 
                                onClick={() => admin.phone ? window.open(`https://wa.me/${admin.phone.replace(/\D/g, '')}`) : toast.error('אין מספר טלפון')} 
                                className="p-2 text-green-600 hover:bg-green-100 rounded-xl transition-colors" 
                                title="שלח וואטסאפ"
                              >
                                <Phone size={20} />
                              </button>
                            )}
                            <button 
                              onClick={() => openChat({ id: admin.id, name: admin.name })} 
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

      {/* Internal Chat rendering removed, now handled globally by App.tsx */}
    </div>
  );
}
