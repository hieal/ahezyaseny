import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, UserMinus, ArrowLeftRight, Search, Check, UserCog } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { Match, User as UserType, WhatsAppGroup } from '../types';
import { toast } from 'react-hot-toast';

import { getGenderedText } from '../utils/gender';

const OrphanedCandidatesPage: React.FC = () => {
  const { user } = useAuth();
  const activeUser = user;
  const [candidates, setCandidates] = useState<Match[]>([]);
  const [admins, setAdmins] = useState<UserType[]>([]);
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeUser?.role === 'super_admin' || activeUser?.role === 'association_manager') {
      loadData();
      console.log('UNASSIGNED VIEW UPDATED WITH HISTORY FIELDS');
    }
  }, [activeUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [candData, adminData, groupsData] = await Promise.all([
        dataService.getOrphanedCandidates(),
        dataService.getUsers(),
        dataService.getWhatsAppGroups()
      ]);
      setCandidates(candData);
      setAdmins(adminData.filter(a => a.role !== 'candidate'));
      setWhatsappGroups(groupsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (selectedCandidates.length === 0 || !selectedAdminId) {
      toast.error('אנא בחר משודכים ומנהל יעד');
      return;
    }

    try {
      await dataService.transferCandidates(selectedCandidates, selectedAdminId);
      toast.success('בקשת העברה נשלחה בהצלחה');
      setSelectedCandidates([]);
      setSelectedAdminId('');
      loadData();
    } catch (err) {
      toast.error('שגיאה בשליחת הבקשה');
    }
  };

  const toggleCandidate = (id: string) => {
    setSelectedCandidates(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredCandidates = candidates.filter(c => 
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center">טוען...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-right" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
          <UserMinus size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {getGenderedText(activeUser?.gender, 'משודכים ללא מנהל', 'משודכות ללא מנהלת')}
          </h1>
          <p className="text-slate-500 font-medium text-sm">ניהול והעברת כרטיסים שהתייתמו ממנהל</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800">
              בחר {getGenderedText(activeUser?.gender, 'משודכים', 'משודכות')} ({selectedCandidates.length})
            </h3>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-luxury-blue w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredCandidates.map(match => (
              <button
                key={match.id}
                onClick={() => toggleCandidate(match.id)}
                className={`p-4 rounded-2xl border-2 transition-all text-right flex items-center gap-3 ${
                  selectedCandidates.includes(match.id) 
                    ? 'border-luxury-blue bg-blue-50 shadow-md' 
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                  {match.image_url ? (
                    <img src={match.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{match.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {getGenderedText(match.type as any, 'בחור', 'בחורה')} • {match.age}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 italic">
                      <span className="font-bold">מנהל קודם:</span>
                      <span>{match.previous_admin_name || 'לא ידוע'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 italic">
                      <span className="font-bold">קבוצה אחרונה:</span>
                      <span>
                        {match.last_known_group 
                          ? (whatsappGroups.find(g => g.id === match.last_known_group)?.name || 'קבוצה לא ידועה') 
                          : 'לא ידוע'}
                      </span>
                    </div>
                  </div>
                  {match.transfer_status === 'approved' && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1">הועבר בהצלחה</p>
                  )}
                </div>
                {selectedCandidates.includes(match.id) && (
                  <div className="w-6 h-6 rounded-full bg-luxury-blue text-white flex items-center justify-center">
                    <Check size={14} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <UserCog size={20} className="text-luxury-blue" />
              בחר {getGenderedText(activeUser?.gender, 'מנהל יעד', 'מנהלת יעד')}
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {admins.map(admin => (
                <button
                  key={admin.id}
                  onClick={() => setSelectedAdminId(admin.id)}
                  className={`w-full p-3 rounded-xl border-2 transition-all text-right flex items-center gap-3 ${
                    selectedAdminId === admin.id 
                      ? 'border-luxury-blue bg-blue-50' 
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                    <User size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{admin.full_name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">
                      {getGenderedText(admin.gender, 'מנהל', 'מנהלת')}
                    </p>
                  </div>
                  {selectedAdminId === admin.id && (
                    <div className="w-5 h-5 rounded-full bg-luxury-blue text-white flex items-center justify-center">
                      <Check size={12} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={handleTransfer}
              disabled={selectedCandidates.length === 0 || !selectedAdminId}
              className="w-full py-4 bg-luxury-blue text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 mt-4"
            >
              <ArrowLeftRight size={20} />
              <span>בצע העברה</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default OrphanedCandidatesPage;
