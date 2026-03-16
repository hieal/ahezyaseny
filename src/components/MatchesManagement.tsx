import React, { useState, useEffect } from 'react';
import { Match } from '../types';
import { dataService } from '../services/dataService';
import { toast } from 'react-hot-toast';
import { Phone, Lock, MessageSquare, Save, User, Users } from 'lucide-react';

export default function MatchesManagement() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
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
                <td className="p-3 font-bold">{match.name}</td>
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
                <td className="p-3">
                  <button 
                    onClick={() => sendWhatsApp(match.phone)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    <MessageSquare size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
