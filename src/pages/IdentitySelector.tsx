import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Users, Heart, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { dataService } from '../services/dataService';
import { WhatsAppGroup, User, Match } from '../types';

export default function IdentitySelector() {
  const { setImpersonation } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'admin' | 'team_leader' | 'candidate' | null>(null);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [groupsData, usersData, matchesData] = await Promise.all([
        dataService.getWhatsAppGroups(),
        dataService.getUsers(),
        dataService.getMatches()
      ]);
      setGroups(groupsData);
      setUsers(usersData);
      setMatches(matchesData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSelect = (selectedRole: 'admin' | 'team_leader' | 'candidate') => {
    setRole(selectedRole);
    setSelectedGroupId(null);
  };

  const handleUserSelect = (user: User | Match) => {
    // @ts-ignore
    setImpersonation(user);
    navigate('/');
  };

  const filteredUsers = role === 'team_leader' 
    ? users.filter(u => u.assigned_group_id === selectedGroupId)
    : matches.filter(m => JSON.parse(m.viewer_group_ids || '[]').includes(selectedGroupId));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8 border border-slate-100"
      >
        <h1 className="text-3xl font-black text-slate-900 mb-8 text-center">בחירת זהות צפייה</h1>
        
        {!role ? (
          <div className="grid grid-cols-1 gap-4">
            <button onClick={() => handleSelect('admin')} className="p-6 flex items-center gap-4 border-2 border-purple-200 rounded-2xl hover:border-purple-500 transition-all bg-gradient-to-r from-purple-50 to-amber-50">
              <ShieldCheck size={32} className="text-purple-600" />
              <h3 className="font-bold text-xl text-purple-900">מנהל ראשי</h3>
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
              onChange={(e) => setSelectedGroupId(e.target.value)}
              value={selectedGroupId || ''}
            >
              <option value="">בחר קבוצה</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>

            {selectedGroupId && (
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
