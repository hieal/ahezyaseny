import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';
import { UserPlus } from 'lucide-react';

const ImportPortal = () => {
  const [availableMatches, setAvailableMatches] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('current_user') || '{}');
    setCurrentUser(user);
    fetchAvailableMatches();
  }, []);

  const fetchAvailableMatches = async () => {
    // Assuming available matches are candidates not managed by anyone
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .is('managed_by', null); // Need to add managed_by column to candidates table if it doesn't exist
    if (error) toast.error('שגיאה בטעינת מועמדים');
    else setAvailableMatches(data || []);
  };

  const assignToMe = async (candidateId: string) => {
    if (!currentUser) return;
    const { error } = await supabase
      .from('candidates')
      .update({ managed_by: currentUser.id })
      .eq('id', candidateId);
    
    if (error) toast.error('שגיאה בהקצאה');
    else {
      toast.success('הוקצה בהצלחה');
      fetchAvailableMatches();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">פורטל ייבוא והקצאה</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-2 border">שם</th>
            <th className="p-2 border">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {availableMatches.map(match => (
            <tr key={match.id}>
              <td className="p-2 border">{match.full_name}</td>
              <td className="p-2 border">
                <button onClick={() => assignToMe(match.id)} className="bg-blue-500 text-white p-2 rounded flex items-center gap-2">
                  <UserPlus size={16}/> הקצה לי
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ImportPortal;
