import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AdminLiveTracker: React.FC = () => {
  const [activeGames, setActiveGames] = useState<any[]>([]);

  useEffect(() => {
    // האזנה לאירועים מכל המשחקים
    const channel = supabase.channel('maze-game')
      .on('broadcast', { event: 'player_moved' }, (payload) => {
        console.log('Admin saw move:', payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">מעקב משחקים פעילים (מצב צפייה)</h1>
      <div className="grid gap-4">
        {activeGames.length === 0 && <p>אין משחקים פעילים כרגע.</p>}
        {/* כאן ירונדרו המשחקים הפעילים */}
      </div>
    </div>
  );
};

export default AdminLiveTracker;
