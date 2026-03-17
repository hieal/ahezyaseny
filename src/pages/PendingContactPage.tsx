import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Match } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function PendingContactPage() {
  const { user, effectiveUser } = useAuth();
  const activeUser = effectiveUser || user;
  const [candidates, setCandidates] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingCandidates();
  }, [activeUser]);

  const fetchPendingCandidates = async () => {
    setLoading(true);
    try {
      // Assuming getMatches() can be filtered or we filter here
      const allCandidates = await dataService.getMatches(undefined, activeUser || undefined);
      let pending = allCandidates.filter(c => c.initial_contact_done === false);

      if (activeUser?.role === 'team_leader') {
        pending = pending.filter(c => c.managed_by === activeUser.id);
      }
      
      setCandidates(pending);
    } catch (err) {
      toast.error('שגיאה בטעינת ממתינים לקשר');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysPending = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) return <div>טוען...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">ממתינים לקשר ראשוני</h1>
      <table className="w-full bg-white rounded-lg shadow">
        <thead>
          <tr className="border-b">
            <th className="p-4 text-right">שם</th>
            <th className="p-4 text-right">ימים בהמתנה</th>
            <th className="p-4 text-right">סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map(c => (
            <tr key={c.id} className="border-b">
              <td className="p-4">{c.full_name}</td>
              <td className="p-4">{calculateDaysPending(c.created_at)}</td>
              <td className="p-4">ממתין לקשר</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
