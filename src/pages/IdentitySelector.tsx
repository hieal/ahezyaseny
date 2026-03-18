import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Users, Heart, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { dataService } from '../services/dataService';
import { User, Match } from '../types';

export default function IdentitySelector() {
  const { setImpersonation } = useAuth();
  const [role, setRole] = useState<'admin' | 'team_leader' | 'candidate' | 'super_admin' | null>(null);
  const [affiliationGroups, setAffiliationGroups] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [usersData, matchesData] = await Promise.all([
        dataService.getUsers(),
        dataService.getMatches()
      ]);
      setUsers(usersData);
      setMatches(matchesData);
      
      const groups = Array.from(new Set(usersData.map(u => u.affiliation_group).filter(Boolean) as string[]));
      setAffiliationGroups(groups);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSelect = (selectedRole: 'admin' | 'team_leader' | 'candidate' | 'super_admin') => {
    if (selectedRole === 'super_admin') {
      // Direct login as super_admin
      const superAdmin = users.find(u => u.role === 'super_admin');
      if (superAdmin) {
        setImpersonation(superAdmin);
        window.location.href = '/';
      }
      return;
    }
    setRole(selectedRole);
    setSelectedGroup(null);
  };

  const handleUserSelect = (user: User | Match) => {
    setImpersonation(user as any);
    window.location.href = '/';
  };

  const filteredUsers = role === 'team_leader' 
    ? users.filter(u => u.affiliation_group === selectedGroup)
    : matches.filter(m => {
        const candidate = users.find(u => u.id === (m as any).candidate_id);
        return candidate?.affiliation_group === selectedGroup;
      });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8 border border-slate-100"
      >
        <h1 className="text-3xl font-black text-[#D4AF37] mb-8 text-center">ברוך הבא, מלאכי צוריאל - מנהל העמותה</h1>
        
        {!role ? (
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => handleSelect('super_admin')} className="p-6 flex items-center gap-4 border-2 border-purple-200 rounded-2xl hover:border-purple-500 transition-all bg-gradient-to-r from-purple-50 to-amber-50">
              <ShieldCheck size={32} className="text-purple-600" />
              <h3 className="font-bold text-xl text-purple-900">מנהל ראשי</h3>
            </button>
            <button onClick={() => window.location.href = '/admin-dashboard'} className="p-6 flex items-center gap-4 border-2 border-[#D4AF37] rounded-2xl hover:border-[#D4AF37] transition-all bg-gradient-to-r from-amber-50 to-yellow-50 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <ShieldCheck size={32} className="text-[#D4AF37]" />
              <h3 className="font-bold text-xl text-[#D4AF37]">מרכז שליטה - מנהל העמותה</h3>
            </button>
            <button onClick={() => handleSelect('team_leader')} className="p-6 flex items-center gap-4 border-2 border-purple-200 rounded-2xl hover:border-purple-500 transition-all bg-gradient-to-r from-purple-50 to-amber-50">
              <Users size={32} className="text-purple-600" />
              <h3 className="font-bold text-xl text-purple-900">ראש צוות / מנהל</h3>
            </button>
            <button onClick={() => handleSelect('candidate')} className="p-6 flex items-center gap-4 border-2 border-purple-200 rounded-2xl hover:border-purple-500 transition-all bg-gradient-to-r from-purple-50 to-amber-50">
              <Heart size={32} className="text-purple-600" />
              <h3 className="font-bold text-xl text-purple-900">משודך</h3>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <button onClick={() => setRole(null)} className="text-purple-600 flex items-center gap-1 font-bold">
              <ChevronLeft size={20} /> חזור
            </button>
            
            <select 
              className="w-full p-4 rounded-2xl border border-slate-200 font-bold"
              onChange={(e) => setSelectedGroup(e.target.value)}
              value={selectedGroup || ''}
            >
              <option value="">בחר קבוצת שיוך</option>
              {affiliationGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            {selectedGroup && (
              <div className="grid grid-cols-1 gap-2">
                {filteredUsers.map(u => (
                  <button 
                    key={u.id} 
                    onClick={() => handleUserSelect(u as any)}
                    className="p-4 flex items-center gap-4 border border-slate-100 rounded-xl hover:bg-purple-50 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                      {u.full_name?.[0]}
                    </div>
                    <span className="font-bold text-slate-900">{u.full_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
