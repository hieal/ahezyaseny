import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const Leaderboard: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      const { data, error } = await supabase.from('game_results').select('*');
      if (data) setResults(data);
    };
    fetchResults();
  }, []);

  const tables = [
    { title: 'יחידים', type: 'individuals' },
    { title: 'זוגות (שיתוף פעולה)', type: 'pairs' },
    { title: 'זוג נגד זוג', type: 'pair_vs_pair' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">טבלת מובילים</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tables.map(t => (
          <div key={t.type} className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">{t.title}</h2>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-right">שחקן/ים</th>
                  <th className="text-right">זמן</th>
                </tr>
              </thead>
              <tbody>
                {results.filter(r => r.game_type === t.type).sort((a, b) => a.duration.localeCompare(b.duration)).map((r, i) => (
                  <tr key={i}>
                    <td>{r.players.join(', ')}</td>
                    <td>{r.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
