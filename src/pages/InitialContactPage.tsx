import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { toast } from 'react-hot-toast';
import { Clock } from 'lucide-react';

const InitialContactPage = () => {
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('initial_contact_done', false);
    if (error) toast.error('שגיאה בטעינת מועמדים');
    else setCandidates(data || []);
  };

  const getTimeDiff = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - created) / (1000 * 60 * 60)); // hours
    return diff;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">מעקב קשר ראשוני</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-2 border">שם</th>
            <th className="p-2 border">זמן מאז יצירה (שעות)</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map(c => (
            <tr key={c.id}>
              <td className="p-2 border">{c.full_name}</td>
              <td className="p-2 border flex items-center gap-2">
                <Clock size={16}/> {getTimeDiff(c.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InitialContactPage;
