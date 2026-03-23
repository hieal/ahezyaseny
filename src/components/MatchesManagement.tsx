import React, { useState, useEffect } from 'react';
import { Match, User } from '../types';
import { dataService } from '../services/dataService';
import { toast } from 'react-hot-toast';
import { Phone, Lock, MessageSquare, Save, User as UserIcon, Users, X, Trash2, Edit2 } from 'lucide-react';

export default function MatchesManagement() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<User[]>([]);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<Match | null>(null);

  useEffect(() => {
    fetchMatches();
    fetchManagers();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const data = await dataService.getMatches();
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
      toast.error('שגיאה בטעינת משודכים');
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const data = await dataService.getUsers();
      setManagers(data.filter(u => ['admin', 'super_admin', 'association_manager', 'team_leader'].includes(u.role)));
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    }
  };

  const handleUpdateMatch = async (id: string, updates: Partial<Match>) => {
    try {
      await dataService.updateMatch(id, updates);
      setMatches(matches.map(m => m.id === id ? { ...m, ...updates } : m));
      toast.success('עודכן בהצלחה');
    } catch (err) {
      console.error('Failed to update match:', err);
      toast.error('שגיאה בעדכון');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dataService.deleteMatch(id);
      setMatches(matches.filter(m => m.id !== id));
      toast.success('נמחק בהצלחה');
    } catch (err) {
      console.error('Failed to delete match:', err);
      toast.error('שגיאה במחיקה');
    }
  };

  const openChat = (match: Match) => {
    setSelectedChatUser(match);
    setIsChatOpen(true);
  };

  const handleEdit = (match: Match) => {
    // Placeholder for edit functionality
    toast('עריכה תתאפשר בקרוב');
  };

  const handleSuggestMatch = async () => {
    if (!selectedMatch || !selectedManagerId) return;
    try {
      await dataService.updateMatch(selectedMatch.id, { managed_by: selectedManagerId });
      setMatches(matches.map(m => m.id === selectedMatch.id ? { ...m, managed_by: selectedManagerId } : m));
      toast.success('המשודך שויך בהצלחה');
      setShowSuggestModal(false);
      setSelectedMatch(null);
      setSelectedManagerId('');
    } catch (err) {
      console.error('Failed to suggest match:', err);
      toast.error('שגיאה בשיוך המשודך');
    }
  };

  const sendWhatsApp = (phone: string | null) => {
    if (!phone) {
      toast.error('אין מספר טלפון');
      return;
    }
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
  };

  if (loading) return <div>טוען...</div>;

  return (
    <div className="card p-6">
      <h2 className="text-2xl font-bold mb-6">ניהול משודכים</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="p-3">שם</th>
              <th className="p-3">טלפון</th>
              <th className="p-3">סיסמה</th>
              <th className="p-3">מנהל</th>
              <th className="p-3">קבוצה</th>
              <th className="p-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(match => (
              <tr key={match.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3 font-bold">{match.full_name}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      defaultValue={match.phone || ''}
                      onBlur={(e) => handleUpdateMatch(match.id, { phone: e.target.value })}
                      className="input-field w-32"
                    />
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      defaultValue={match.password || '12345678'}
                      onBlur={(e) => handleUpdateMatch(match.id, { password: e.target.value })}
                      className="input-field w-24"
                    />
                    <button 
                      onClick={() => handleUpdateMatch(match.id, { password: '12345678' })}
                      className="p-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                      title="איפוס סיסמה"
                    >
                      איפוס
                    </button>
                  </div>
                </td>
                <td className="p-3">{match.creator_name || 'לא מוגדר'}</td>
                <td className="p-3">{match.category || 'לא מוגדר'}</td>
                <td className="p-3 flex gap-2">
                  <button 
                    onClick={() => sendWhatsApp(match.phone)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    title="שלח וואטסאפ"
                  >
                    <MessageSquare size={20} />
                  </button>
                  <button 
                    onClick={() => openChat(match)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="שלח הודעה"
                  >
                    <MessageSquare size={20} />
                  </button>
                  <button 
                    onClick={() => handleEdit(match)}
                    className="p-2 text-luxury-blue hover:bg-blue-50 rounded-lg"
                    title="ערוך משודך"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={() => handleDelete(match.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="מחק משודך"
                  >
                    <Trash2 size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedMatch(match);
                      setShowSuggestModal(true);
                    }}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                    title="הצע משודך"
                  >
                    <Users size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {showSuggestModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">הצע משודך למנהל</h2>
              <button onClick={() => setShowSuggestModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            <select 
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-4"
            >
              <option value="">בחר מנהל...</option>
              {managers.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
            <button 
              onClick={handleSuggestMatch}
              className="w-full py-3 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition-all"
            >
              שלח
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
