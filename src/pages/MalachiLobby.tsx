import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { CATEGORIES } from '../constants';
import { Shield, Users, UserCog, User, Eye, LogOut, ChevronRight, Search, LayoutDashboard, Heart, UserCheck, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function MalachiLobby() {
  const { user, setSafeMode, setImpersonatedUser, logout, setActiveRole } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'main' | 'select-group' | 'select-user' | 'select-candidate'>('main');
  const [selectionType, setSelectionType] = useState<'admin' | 'team_leader' | 'candidate' | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const isMalachi = user?.phone === '0556603336';
    const isGood = user?.username === 'good' || user?.email === 'good';
    
    if (!isMalachi && !isGood) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleEnterAsSuperAdmin = () => {
    setSafeMode(true);
    setImpersonatedUser(null);
    setActiveRole('super_admin');
    navigate('/');
    toast.success('כניסה במצב צפייה בלבד (מנהל ראשי)');
  };

  const handleEnterAsAdmin = () => {
    setSelectionType('admin');
    setStep('select-group');
  };

  const handleEnterAsTeamLeader = () => {
    setSelectionType('team_leader');
    setStep('select-group');
  };

  const handleEnterAsCandidate = () => {
    setSelectionType('candidate');
    setStep('select-candidate');
    setCandidates([]); // Clear previous
    setSearchTerm('');
  };

  const handleGroupSelect = async (group: string) => {
    setSelectedGroup(group);
    setLoading(true);
    setSearchTerm('');
    try {
      if (selectionType === 'candidate') {
        const { data } = await supabase
          .from('matches')
          .select('*')
          .eq('affiliation_group', group)
          .order('created_at', { ascending: false });
        setCandidates(data || []);
        setStep('select-candidate');
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('affiliation_group', group)
          .eq('role', selectionType)
          .eq('status', 'active');
        setUsers(data || []);
        setStep('select-user');
      }
    } catch (e) {
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (selectedUser: any) => {
    setSafeMode(true);
    setImpersonatedUser(selectedUser);
    setActiveRole(selectionType as any);
    navigate('/');
    toast.success(`כניסה במצב צפייה בלבד (${selectionType === 'admin' ? 'מנהל' : 'ראש צוות'}: ${selectedUser.full_name})`);
  };

  const handleEnterAsAssociationManager = () => {
    setSafeMode(false);
    setImpersonatedUser(null);
    setActiveRole('association_manager');
    navigate('/');
    toast.success('כניסה לממשק אישי (מנהל העמותה)');
  };

  const handleSearchCandidates = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .ilike('full_name', `%${searchTerm}%`)
        .limit(50);
      setCandidates(data || []);
    } catch (e) {
      toast.error('שגיאה בחיפוש משודכים');
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateSelect = (candidate: any) => {
    setSafeMode(true);
    setImpersonatedUser(null);
    navigate(`/matches/${candidate.type === 'male' ? 'males' : 'females'}`);
    toast.success(`צפייה בכרטיס משודך: ${candidate.full_name}`);
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phone?.includes(searchTerm)
  );

  const filteredCandidates = candidates.filter(c => 
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans" dir="rtl">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block p-4 bg-white rounded-3xl shadow-xl mb-6 border border-slate-100"
          >
            <Shield size={64} className="text-[#D4AF37]" />
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">לובי ניהול - מנהל העמותה</h1>
          <p className="text-slate-500 text-lg">ברוך הבא מלאכי צוריאל - מנהל העמותה</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'main' && (
            <motion.div
              key="main"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <LobbyButton
                icon={<Shield size={32} />}
                title="כניסה בתור מנהל ראשי"
                description="ממשק ניהול מלא (צפייה בלבד)"
                onClick={handleEnterAsSuperAdmin}
                color="bg-amber-500"
              />
              <LobbyButton
                icon={<Users size={32} />}
                title="כניסה בתור מנהל"
                description="בחירת מנהל וצפייה בממשק שלו"
                onClick={handleEnterAsAdmin}
                color="bg-blue-500"
              />
              <LobbyButton
                icon={<UserCog size={32} />}
                title="כניסה בתור ראש צוות"
                description="בחירת ראש צוות וצפייה בממשק שלו"
                onClick={handleEnterAsTeamLeader}
                color="bg-indigo-500"
              />
              <LobbyButton
                icon={<LayoutDashboard size={32} />}
                title="כניסה בתור מנהל העמותה"
                description="ממשק אישי מצומצם (ניהול מלא)"
                onClick={handleEnterAsAssociationManager}
                color="bg-[#D4AF37]"
                highlight
              />
              <LobbyButton
                icon={<User size={32} />}
                title="כניסה בתור משודך"
                description="חיפוש משודך או בחירה לפי קבוצה"
                onClick={handleEnterAsCandidate}
                color="bg-emerald-500"
              />
              <LobbyButton
                icon={<LogOut size={32} />}
                title="התנתקות"
                description="יציאה מהמערכת"
                onClick={logout}
                color="bg-slate-400"
              />
            </motion.div>
          )}

          {step === 'select-group' && (
            <motion.div
              key="groups"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900">
                  {selectionType === 'candidate' ? 'בחר קבוצה לסינון משודכים' : `בחר קבוצה לחיפוש ${selectionType === 'admin' ? 'מנהל' : 'ראש צוות'}`}
                </h2>
                <button onClick={() => setStep(selectionType === 'candidate' ? 'select-candidate' : 'main')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  חזרה <ChevronRight size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => handleGroupSelect(category)}
                    className="p-4 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all font-bold text-center"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'select-user' && (
            <motion.div
              key="users"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900">בחר {selectionType === 'admin' ? 'מנהל' : 'ראש צוות'} מקבוצת {selectedGroup}</h2>
                <button onClick={() => setStep('select-group')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  חזרה <ChevronRight size={20} />
                </button>
              </div>
              
              <div className="relative mb-6">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder={`חפש ${selectionType === 'admin' ? 'מנהל' : 'ראש צוות'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {loading ? (
                <div className="flex justify-center p-12">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleUserSelect(u)}
                      className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all text-right"
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {u.full_name?.[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{u.full_name}</div>
                        <div className="text-xs text-slate-500">{u.phone}</div>
                      </div>
                    </button>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400">לא נמצאו {selectionType === 'admin' ? 'מנהלים' : 'ראשי צוות'}</div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {step === 'select-candidate' && (
            <motion.div
              key="candidates"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900">חיפוש משודך לצפייה</h2>
                <button onClick={() => setStep('main')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  חזרה <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="חפש לפי שם (אפשרות ב')..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCandidates()}
                    className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <button 
                  onClick={handleSearchCandidates}
                  className="px-6 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all"
                >
                  חפש
                </button>
              </div>

              <div className="mb-6">
                <button 
                  onClick={() => setStep('select-group')}
                  className="w-full p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                >
                  <Users size={20} />
                  בחירה לפי קבוצה (אפשרות א')
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center p-12">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2">
                  {filteredCandidates.map(candidate => (
                    <button
                      key={candidate.id}
                      onClick={() => handleCandidateSelect(candidate)}
                      className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all text-right"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${candidate.type === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                        {candidate.full_name?.[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{candidate.full_name}</div>
                        <div className="text-xs text-slate-500">{candidate.age} | {candidate.city}</div>
                        <div className="text-[10px] text-slate-400">{candidate.affiliation_group}</div>
                      </div>
                    </button>
                  ))}
                  {candidates.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 text-slate-400">חפש משודך או בחר קבוצה</div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LobbyButton({ icon, title, description, onClick, color, highlight = false }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-6 rounded-3xl shadow-lg border transition-all text-right flex flex-col gap-4 ${
        highlight 
          ? 'bg-white border-[#D4AF37] ring-2 ring-[#D4AF37]/20' 
          : 'bg-white border-slate-100 hover:border-slate-200'
      }`}
    >
      <div className={`w-16 h-16 ${color} text-white rounded-2xl flex items-center justify-center shadow-lg`}>
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-black text-slate-900 mb-1">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.button>
  );
}
