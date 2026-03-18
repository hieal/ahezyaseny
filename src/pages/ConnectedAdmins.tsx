import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { User } from '../types';
import { getGenderedText } from '../utils/gender';
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
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'team_leader' | 'viewer'>('all');

  const filteredAdmins = allAdmins.filter(admin => 
    (admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     admin.phone?.includes(searchTerm))
  );

  return (
    <>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Users className="text-luxury-blue" size={32} />
              מנהלים מחוברים ({Object.keys(presenceState).length})
            </h1>
            <p className="text-slate-500 mt-2 font-medium">צפה במנהלים המחוברים כעת למערכת וצור איתם קשר</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-sm font-bold text-slate-600">סינון לפי תפקיד:</span>
          {(['all', 'admin', 'team_leader', 'viewer'] as const).map(role => (
            <button 
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${roleFilter === role ? 'bg-luxury-blue text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              {role === 'all' ? 'הכל' : role === 'admin' ? 'מנהל' : role === 'team_leader' ? 'ראש צוות' : 'צופה'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdmins
            .filter(a => roleFilter === 'all' || (roleFilter === 'admin' && (a.role === 'admin' || a.role === 'super_admin')) || a.role === roleFilter)
            .map(admin => (
              <div key={admin.id} className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-luxury-blue transition-all flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-white shadow-inner">
                  {admin.avatar_url ? <img src={dataService.getPublicImageUrl(admin.avatar_url)} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <UserIcon size={32} />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-slate-900">{admin.full_name}</h3>
                  <p className="text-sm font-bold text-luxury-blue">{admin.role === 'super_admin' ? 'מנהל ראשי' : admin.role === 'team_leader' ? 'ראש צוות' : 'מנהל'}</p>
                </div>
                <button onClick={() => openChat({ id: admin.id, name: admin.full_name || 'מנהל' })} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100">
                  <MessageSquare size={20} />
                </button>
              </div>
            ))}
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
                              <div className={`font-bold ${admin.phone === '0556603336' ? 'text-[#D4AF37]' : 'text-slate-900'}`}>
                                {admin.full_name || 'מנהל'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {admin.phone === '0556603336' ? (
                              <span className="text-[#D4AF37] font-bold">מנהל העמותה</span>
                            ) : (
                              admin.role === 'super_admin' ? 'מנהל ראשי' : admin.role === 'team_leader' ? getGenderedText(admin.gender, 'ראש צוות', 'ראשת צוות') : 'מנהל'
                            )}
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
                                onClick={() => openChat({ id: admin.id, name: admin.full_name || 'מנהל' })} 
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
      </div>
    </>
  );
}
