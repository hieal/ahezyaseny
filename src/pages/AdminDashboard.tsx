import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Match, User } from '../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ boys: 0, girls: 0 });
  const [pendingMatches, setPendingMatches] = useState<Match[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const candidates = await dataService.getMatches();
      
      // Calculate stats
      const boys = candidates.filter(c => c.type === 'male').length;
      const girls = candidates.filter(c => c.type === 'female').length;
      setStats({ boys, girls });

      // Pending matches (assuming 'status' or similar field, mocking for now)
      setPendingMatches(candidates.filter(c => (c as any).status === 'pending'));

      // History (this would need a specific service method, mocking for now)
      setHistory([]); 
    };
    fetchData();
  }, []);

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-black text-amber-900 mb-8 flex items-center gap-3">
        <ShieldCheck className="text-amber-600" size={36} />
        מרכז שליטה - מנהל העמותה (Read-Only)
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-500 mb-4">סטטיסטיקת משודכים</h2>
          <p>בנים: {stats.boys}</p>
          <p>בנות: {stats.girls}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-500 mb-4">לא נוצר קשר ({pendingMatches.length})</h2>
          <div className="max-h-60 overflow-y-auto">
            {pendingMatches.map(m => <div key={m.id} className="text-sm border-b p-2">{m.full_name}</div>)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="font-bold text-slate-500 mb-4">היסטוריית פעולות</h2>
          <p className="text-slate-400">אין נתונים זמינים</p>
        </div>
      </div>
    </div>
  );
}
