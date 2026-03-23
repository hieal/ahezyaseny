import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { User } from '../types';
import { getAvatarUrl, getAvatarFallback } from '../utils/image';
import { getGenderedText } from '../utils/gender';
import { Users, Phone, MessageSquare, User as UserIcon, Search, CheckCircle, Filter, ChevronDown, UserCheck, LayoutGrid, Table as TableIcon, Layers, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useChat } from '../contexts/ChatContext';
import { usePresence } from '../contexts/PresenceContext';
import { OnlineIndicator } from '../components/OnlineIndicator';
import { Avatar } from '../components/Avatar';
import { CATEGORIES } from '../constants';
import { supabase } from '../services/supabase';

export default function ConnectedAdmins() {
  const { user } = useAuth();
  const { openChat } = useChat();
  const { presenceState } = usePresence();
  const [allAdmins, setAllAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'team_leader' | 'viewer'>('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'carousel'>('cards');
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    console.log('Connected Admins Page: Real-time status sync for anchors enabled.');
    const fetchAdmins = async () => {
      setLoading(true);
      try {
        // Fetch all profiles
        const { data: users, error } = await supabase
          .from('profiles')
          .select('*');
        
        if (error) throw error;
        
        let fetchedUsers = users || [];
        const hasMalachi = fetchedUsers.some(u => u.email === 'malachi@tzuriel.org' || u.phone === '0556603336');
        if (!hasMalachi) {
          fetchedUsers.push({
            id: 'malachi-placeholder-id',
            username: 'malachi',
            password_plain: '123456',
            full_name: 'מלאכי צוריאל',
            email: 'malachi@tzuriel.org',
            role: 'association_manager',
            status: 'active',
            gender: 'male',
            phone: '0556603336',
            avatar_url: null
          } as User);
        }
        
        setAllAdmins(fetchedUsers);
      } catch (err) {
        console.error('Error fetching admins:', err);
        toast.error('שגיאה בטעינת מנהלים. אנא נסה שוב מאוחר יותר.');
      } finally {
        setLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  const filteredAdmins = allAdmins.filter(admin => {
    // 1. Calculate online status (Exclusive)
    const isOnline = (admin.last_seen && new Date().getTime() - new Date(admin.last_seen).getTime() < 5 * 60 * 1000) || admin.id === user?.id;
    
    // 2. Role/Name filtering (Category independent)
    const role = admin.role?.toLowerCase() || '';
    const isTargetRole = ['admin', 'super_admin', 'association_manager', 'manager', 'owner'].includes(role);
    const isMalachi = admin.full_name?.includes('מלאכי') || admin.full_name?.includes('צוריאל');
    
    const matchesSearch = (admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          admin.phone?.includes(searchTerm));
    const matchesRole = roleFilter === 'all' || 
                        (roleFilter === 'admin' && (role === 'admin' || role === 'super_admin' || role === 'association_manager' || role === 'manager' || role === 'owner')) || 
                        role === roleFilter.toLowerCase();
    
    // 3. Status filtering (Exclusive)
    let matchesStatus = true;
    if (filter === 'online') matchesStatus = isOnline;
    if (filter === 'offline') matchesStatus = !isOnline;
    
    // Include if it's a target role OR it's Malachi, AND matches search/status
    return (isTargetRole || isMalachi) && matchesSearch && matchesRole && matchesStatus;
  });

  const onlineAdminsCount = allAdmins.filter(admin => {
    return admin.last_seen && new Date().getTime() - new Date(admin.last_seen).getTime() < 5 * 60 * 1000;
  }).length;

  const carouselItems = filteredAdmins.slice(carouselIndex, carouselIndex + 3);

  const nextCarousel = () => {
    if (carouselIndex + 3 < filteredAdmins.length) {
      setCarouselIndex(carouselIndex + 3);
    }
  };

  const prevCarousel = () => {
    if (carouselIndex - 3 >= 0) {
      setCarouselIndex(carouselIndex - 3);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Users className="text-luxury-blue" size={32} />
            מנהלים ({filteredAdmins.length})
          </h1>
          <p className="text-slate-500 mt-2 font-medium">צפה בכל המנהלים במערכת וצור איתם קשר</p>
        </div>

        <div className="flex gap-2 bg-slate-100 p-1 rounded-full">
          {(['all', 'online', 'offline'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                filter === f 
                  ? f === 'all' ? 'bg-[#1d4ed8] text-white shadow-md' 
                  : f === 'online' ? 'bg-[#16a34a] text-white shadow-md'
                  : 'bg-[#4b5563] text-white shadow-md'
                  : 'bg-[#f3f4f6] text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? 'הכל' : f === 'online' ? 'מחוברים' : 'לא מחוברים'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="תצוגת טבלה"
          >
            <TableIcon size={20} />
          </button>
          <button 
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'cards' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="תצוגת כרטיסים"
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('carousel')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'carousel' ? 'bg-white text-luxury-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            title="תצוגת קרוסלה"
          >
            <Layers size={20} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase mr-1">חיפוש חופשי</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="חפש לפי שם או טלפון..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-luxury-blue outline-none text-sm font-bold"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase mr-1">סינון לפי תפקיד</label>
          <div className="flex flex-wrap gap-2">
            {(['all', 'admin', 'team_leader', 'viewer'] as const).map(role => (
              <button 
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${roleFilter === role ? 'bg-luxury-blue text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
              >
                {role === 'all' ? 'הכל' : role === 'admin' ? 'מנהל' : role === 'team_leader' ? 'ראש צוות' : 'צופה'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase mr-1">סינון לפי קבוצה</label>
          <select 
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-luxury-blue outline-none text-sm font-bold text-slate-700"
          >
            <option value="all">כל הקבוצות</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-luxury-blue border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-slate-500">טוען מנהלים...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'table' && (
            <motion.div 
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 text-slate-500 text-sm">
                    <tr>
                      <th className="px-6 py-4 font-bold">שם המנהל</th>
                      <th className="px-6 py-4 font-bold">תפקיד</th>
                      <th className="px-6 py-4 font-bold">קבוצה</th>
                      <th className="px-6 py-4 font-bold">סטטוס</th>
                      <th className="px-6 py-4 font-bold">נראה לאחרונה</th>
                      <th className="px-6 py-4 font-bold text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAdmins.map(admin => {
                      const isOnline = (!!presenceState[admin.id]) || admin.id === user?.id;
                      return (
                        <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200">
                                  <Avatar 
                                    name={admin.full_name || ''}
                                    url={admin.avatar_url}
                                    imageUrl={admin.image_url}
                                    userId={admin.id}
                                    size="md"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <OnlineIndicator isOnline={isOnline} className="absolute bottom-0 right-0 border-2 border-white" />
                              </div>
                              <div className={`font-bold ${admin.phone === '0556603336' ? 'text-[#D4AF37]' : 'text-slate-900'}`}>
                                {admin.full_name || 'מנהל'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              {(admin.full_name?.includes('מלאכי') || admin.full_name?.includes('צוריאל') || admin.phone === '0556603336' || admin.role === 'association_manager') ? (
                                <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-[#D4AF37] text-white">
                                  ★ מנהל העמותה
                                </span>
                              ) : (
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                  admin.role === 'super_admin' ? 'bg-amber-100 text-amber-700' : 
                                  (!!admin.is_team_leader || admin.role === 'team_leader') ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {(!!admin.is_team_leader || admin.role === 'team_leader') ? 'ראש צוות' : 
                                   admin.role === 'super_admin' ? 'מנהל ראשי' : 'מנהל'}
                                </span>
                              )}
                              {(!!admin.is_team_leader || admin.role === 'team_leader') && ['admin', 'super_admin', 'owner', 'manager'].includes(admin.role || '') && (
                                <span className="text-[10px] text-slate-400 cursor-help" title="משמש גם כמנהל">+</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-500">
                            {admin.affiliation_group || 'ללא קבוצה'}
                          </td>
                          <td className="px-6 py-4">
                            {isOnline ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-green-100 text-green-800">
                                מחובר כעת
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                                לא מחובר
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs font-bold">
                            {isOnline ? 'עכשיו' : (admin.last_seen ? new Date(admin.last_seen).toLocaleString('he-IL') : 'לא ידוע')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => openChat({ id: admin.id, name: admin.full_name || 'מנהל' })} 
                                className="w-10 h-10 flex items-center justify-center bg-white text-blue-600 shadow-md rounded-full transition-colors hover:bg-blue-50" 
                                title="שלח הודעת צ'אט"
                              >
                                <MessageSquare size={20} />
                              </button>
                              {admin.phone && (
                                <a 
                                  href={`https://wa.me/${admin.phone?.replace(/\D/g, '')}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="w-10 h-10 flex items-center justify-center bg-white text-green-600 shadow-md rounded-full transition-colors hover:bg-green-50" 
                                  title="שלח וואטסאפ"
                                >
                                  <Phone size={20} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {viewMode === 'cards' && (
            <motion.div 
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredAdmins.map(admin => {
                const isOnline = (!!presenceState[admin.id]) || admin.id === user?.id;
                return (
                  <div key={admin.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-luxury-blue/5 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-150" />
                    
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-white shadow-md">
                          <Avatar 
                            name={admin.full_name || ''}
                            url={admin.avatar_url}
                            imageUrl={admin.image_url}
                            userId={admin.id}
                            size="lg"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <OnlineIndicator isOnline={isOnline} className="absolute -bottom-1 -right-1 border-4 border-white w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {(admin.full_name?.includes('מלאכי') || admin.full_name?.includes('צוריאל')) ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-700">
                            מנהל העמותה
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                            (admin.role === 'super_admin' || admin.role === 'association_manager') ? 'bg-amber-100 text-amber-700' : 
                            (!!admin.is_team_leader || admin.role === 'team_leader') ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {(!!admin.is_team_leader || admin.role === 'team_leader') ? 'ראש צוות' : 
                             (admin.role === 'super_admin' || admin.role === 'association_manager') ? 'מנהל ראשי' : 'מנהל'}
                          </span>
                        )}
                        {(!!admin.is_team_leader || admin.role === 'team_leader') && ['admin', 'super_admin', 'association_manager', 'owner', 'manager'].includes(admin.role || '') && (
                          <span className="text-[10px] text-slate-400 cursor-help" title="משמש גם כמנהל">+</span>
                        )}
                        {isOnline ? (
                          <span className="text-[10px] font-black text-green-600">מחובר כעת</span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">לא מחובר</span>
                        )}
                      </div>
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-slate-900 mb-1">{admin.full_name}</h3>
                      <p className="text-sm font-bold text-slate-500 mb-4">{admin.affiliation_group || 'ללא קבוצה'}</p>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openChat({ id: admin.id, name: admin.full_name || 'מנהל' })} 
                          className="w-10 h-10 flex items-center justify-center bg-white text-blue-600 shadow-md rounded-full hover:bg-blue-50 transition-all"
                        >
                          <MessageSquare size={18} />
                        </button>
                        {admin.phone && (
                          <a 
                            href={`https://wa.me/${admin.phone?.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-10 h-10 flex items-center justify-center bg-white text-green-600 shadow-md rounded-full hover:bg-green-50 transition-all"
                          >
                            <Phone size={18} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {viewMode === 'carousel' && (
            <motion.div 
              key="carousel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
            >
              <div className="flex items-center gap-6">
                <button 
                  onClick={prevCarousel}
                  disabled={carouselIndex === 0}
                  className="p-4 bg-white rounded-full shadow-xl border border-slate-100 text-slate-400 hover:text-luxury-blue disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={32} />
                </button>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {carouselItems.map(admin => {
                      const isOnline = (!!presenceState[admin.id]) || admin.id === user?.id;
                      return (
                        <motion.div 
                          key={admin.id}
                          layout
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl text-center flex flex-col items-center"
                        >
                          <div className="relative mb-6">
                            <div className="w-32 h-32 rounded-[32px] bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border-4 border-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform">
                              <Avatar 
                                name={admin.full_name || ''}
                                url={admin.avatar_url}
                                imageUrl={admin.image_url}
                                userId={admin.id}
                                size="lg"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <OnlineIndicator isOnline={isOnline} className="absolute bottom-2 right-2 border-4 border-white w-8 h-8" />
                          </div>

                          <h3 className="text-2xl font-black text-slate-900 mb-2">{admin.full_name}</h3>
                          <div className="flex flex-col items-center gap-2 mb-6">
                            {(admin.full_name?.includes('מלאכי') || admin.full_name?.includes('צוריאל')) ? (
                              <span className="px-4 py-1.5 rounded-full text-xs font-black bg-purple-100 text-purple-700">
                                מנהל העמותה
                              </span>
                            ) : (
                              <span className={`px-4 py-1.5 rounded-full text-xs font-black ${
                                (admin.role === 'super_admin' || admin.role === 'association_manager') ? 'bg-amber-100 text-amber-700' : 
                                (!!admin.is_team_leader || admin.role === 'team_leader') ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {(!!admin.is_team_leader || admin.role === 'team_leader') ? 'ראש צוות' : 
                                 (admin.role === 'super_admin' || admin.role === 'association_manager') ? 'מנהל ראשי' : 'מנהל'}
                              </span>
                            )}
                            {(!!admin.is_team_leader || admin.role === 'team_leader') && ['admin', 'super_admin', 'association_manager', 'owner', 'manager'].includes(admin.role || '') && (
                              <span className="text-xs text-slate-400 cursor-help" title="משמש גם כמנהל">+</span>
                            )}
                            <span className="text-sm font-bold text-slate-400">{admin.affiliation_group || 'ללא קבוצה'}</span>
                          </div>

                          <div className="w-full grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => openChat({ id: admin.id, name: admin.full_name || 'מנהל' })} 
                              className="flex items-center justify-center gap-2 py-3 bg-luxury-blue text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                            >
                              <MessageSquare size={20} />
                              צ'אט
                            </button>
                            <button 
                              onClick={() => admin.phone && window.open(`https://wa.me/${admin.phone.replace(/\D/g, '')}`)}
                              className="flex items-center justify-center gap-2 py-3 bg-green-50 text-green-600 rounded-2xl font-bold hover:bg-green-100 transition-all border border-green-100"
                            >
                              <Phone size={20} />
                              וואטסאפ
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  
                  {carouselItems.length === 0 && (
                    <div className="col-span-3 py-20 text-center text-slate-400 font-bold">
                      אין מנהלים להצגה לפי הסינון הנוכחי
                    </div>
                  )}
                </div>

                <button 
                  onClick={nextCarousel}
                  disabled={carouselIndex + 3 >= filteredAdmins.length}
                  className="p-4 bg-white rounded-full shadow-xl border border-slate-100 text-slate-400 hover:text-luxury-blue disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={32} />
                </button>
              </div>

              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: Math.ceil(filteredAdmins.length / 3) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCarouselIndex(i * 3)}
                    className={`w-3 h-3 rounded-full transition-all ${Math.floor(carouselIndex / 3) === i ? 'bg-luxury-blue w-8' : 'bg-slate-200'}`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {filteredAdmins.length === 0 && !loading && (
        <div className="bg-white p-20 rounded-[40px] border border-dashed border-slate-200 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">לא נמצאו מנהלים</h3>
          <p className="text-slate-500 font-medium">נסה לשנות את מסנני החיפוש או התפקיד</p>
        </div>
      )}
    </div>
  );
}

