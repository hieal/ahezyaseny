import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { GameLog } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Activity, Users, Trophy, Clock, Eye, Heart, X, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { AdminSpectatorView } from './AdminSpectatorView';

function InterventionModal({ game, onClose }: { game: any, onClose: () => void }) {
  const [message, setMessage] = useState('');

  const sendMessage = () => {
    const globalChannel = supabase.channel('global_game_events');
    globalChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        globalChannel.send({
          type: 'broadcast',
          event: 'admin_message',
          payload: { gameId: game.gameId, message }
        });
        supabase.removeChannel(globalChannel);
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full">
        <h3 className="text-xl font-bold mb-4">שלח הודעה לשחקנים</h3>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 border border-slate-200 rounded-2xl mb-4"
          placeholder="המנהל הראשי צופה בכם ומתרשם מהמשחק!"
          rows={3}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-100 rounded-xl font-bold">ביטול</button>
          <button onClick={sendMessage} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            <Send size={18} /> שלח
          </button>
        </div>
      </div>
    </div>
  );
}


function SpectateModal({ game, onClose }: { game: any, onClose: () => void }) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    let channelName = '';
    if (game.gameType === 'RPS') channelName = `game_${game.gameId}`;
    else if (game.gameType === 'Strategic RPS') channelName = `strat_rps_${game.gameId}`;
    else if (game.gameType === 'Maze') channelName = 'maze-game';

    if (!channelName) return;

    const channel = supabase.channel(channelName)
      .on('broadcast', { event: '*' }, ({ event, payload }) => {
        setEvents(prev => [...prev.slice(-9), { event, payload, time: new Date() }]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-800">צפייה במשחק: {game.gameType}</h2>
            <p className="text-sm text-slate-500">{game.player1Name} נגד {game.player2Name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        <div className="p-6 h-64 overflow-y-auto bg-slate-900 text-green-400 font-mono text-sm flex flex-col gap-2">
          {events.length === 0 ? (
            <div className="text-slate-500 text-center mt-10">ממתין לאירועים...</div>
          ) : (
            events.map((e, i) => (
              <div key={i} className="border-b border-slate-800 pb-1">
                <span className="text-slate-500">[{format(e.time, 'HH:mm:ss')}]</span>{' '}
                <span className="text-blue-400">{e.event}</span>:{' '}
                <span className="text-green-300">{JSON.stringify(e.payload)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function GameMonitoring() {
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [liveGames, setLiveGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [spectatingGame, setSpectatingGame] = useState<any | null>(null);
  const [adminIntervention, setAdminIntervention] = useState<any | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchData();
    
    // Subscribe to live games via presence or specific channels
    // For simplicity, we can listen to a global "games" channel if we had one,
    // but since games use dynamic channels like `strat_rps_${gameId}`, 
    // we might need to rely on a central presence channel or just show recent logs.
    // Let's assume we have a "global_game_events" channel.
    const channel = supabase.channel('global_game_events')
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        setLiveGames(prev => [...prev, payload]);
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }) => {
        setLiveGames(prev => prev.filter(g => g.gameId !== payload.gameId));
        fetchData(); // Refresh logs
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    const [logsData, usersData] = await Promise.all([
      dataService.getGameLogs(),
      dataService.getUsers()
    ]);
    setLogs(logsData);
    setTotalUsers(usersData.length);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate Statistics
  
  // 1. Most Active Players
  const playerCounts: Record<string, { name: string, count: number }> = {};
  logs.forEach(log => {
    if (log.player1_id !== 'system') {
      if (!playerCounts[log.player1_id]) playerCounts[log.player1_id] = { name: log.player1_name, count: 0 };
      playerCounts[log.player1_id].count++;
    }
    if (log.player2_id !== 'system') {
      if (!playerCounts[log.player2_id]) playerCounts[log.player2_id] = { name: log.player2_name, count: 0 };
      playerCounts[log.player2_id].count++;
    }
  });
  const topPlayers = Object.values(playerCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 2. Daily Game Volume
  const dailyVolume: Record<string, number> = {};
  logs.forEach(log => {
    const date = new Date(log.created_at).toLocaleDateString('he-IL');
    dailyVolume[date] = (dailyVolume[date] || 0) + 1;
  });
  const volumeData = Object.entries(dailyVolume).map(([date, count]) => ({ date, count })).reverse();

  // 3. Interaction Insights (Pairs who played > 3 times)
  const pairCounts: Record<string, { p1: string, p2: string, count: number }> = {};
  logs.forEach(log => {
    if (log.player1_id === 'system' || log.player2_id === 'system') return;
    const pairId = [log.player1_id, log.player2_id].sort().join('-');
    if (!pairCounts[pairId]) {
      pairCounts[pairId] = { p1: log.player1_name, p2: log.player2_name, count: 0 };
    }
    pairCounts[pairId].count++;
  });
  const potentialMatches = Object.values(pairCounts).filter(p => p.count >= 3);

  // 4. Engagement Rate
  const activeUsersCount = Object.keys(playerCounts).length;
  const engagementRate = totalUsers > 0 ? Math.round((activeUsersCount / totalUsers) * 100) : 0;
  const engagementData = [
    { name: 'פעילים', value: activeUsersCount, color: '#10b981' },
    { name: 'לא פעילים', value: Math.max(0, totalUsers - activeUsersCount), color: '#e2e8f0' }
  ];

  return (
    <div className="space-y-8">
      {/* Live Feed */}
      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
            <Activity size={24} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-slate-900">משחקים פעילים כעת (Live)</h2>
        </div>
        
        {liveGames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveGames.map((game, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-700">{game.player1Name} ⚔️ {game.player2Name}</div>
                  <div className="text-sm text-slate-500">{game.gameType}</div>
                </div>
                <div className="flex gap-2">
                  {['RPS', 'Strategic RPS', 'Maze'].includes(game.gameType) && (
                    <button 
                      onClick={() => setSpectatingGame(game)}
                      className="p-2 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-colors" 
                      title="צפה במשחק"
                    >
                      <Eye size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => setAdminIntervention(game)}
                    className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors" 
                    title="שלח הודעה לשחקנים"
                  >
                    <MessageSquare size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">אין משחקים פעילים כרגע.</p>
        )}
      </section>

      {spectatingGame && (
        spectatingGame.gameType === 'Strategic RPS' ? (
          <AdminSpectatorView 
            gameId={spectatingGame.gameId} 
            player1Name={spectatingGame.player1Name} 
            player2Name={spectatingGame.player2Name} 
            onClose={() => setSpectatingGame(null)}
            onSendMessage={() => setAdminIntervention(spectatingGame)}
          />
        ) : (
          <SpectateModal game={spectatingGame} onClose={() => setSpectatingGame(null)} />
        )
      )}

      {adminIntervention && (
        <InterventionModal game={adminIntervention} onClose={() => setAdminIntervention(null)} />
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Players */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Users className="text-blue-500" /> השחקנים הפעילים ביותר
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPlayers} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="מספר משחקים" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Daily Volume */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity className="text-emerald-500" /> נפח משחקים יומי
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="משחקים" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Engagement Rate */}
        <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Users className="text-orange-500" /> אחוז מעורבות
          </h3>
          <p className="text-sm text-slate-500 mb-4">אחוז המועמדים ששיחקו לפחות משחק אחד</p>
          <div className="flex-1 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="text-3xl font-black text-slate-800">{engagementRate}%</span>
              <span className="text-xs text-slate-500">מעורבות</span>
            </div>
          </div>
        </section>
      </div>

      {/* Interaction Insights */}
      <section className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-[2.5rem] shadow-sm border border-pink-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center">
            <Heart size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">תובנות אינטראקציה (התאמות פוטנציאליות)</h2>
            <p className="text-sm text-slate-600">זוגות ששיחקו יחד יותר מ-3 פעמים</p>
          </div>
        </div>

        {potentialMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {potentialMatches.map((pair, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="font-bold text-slate-800">{pair.p1}</div>
                  <Heart size={16} className="text-pink-400 fill-pink-400" />
                  <div className="font-bold text-slate-800">{pair.p2}</div>
                </div>
                <div className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-sm font-bold">
                  {pair.count} משחקים
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-4">לא נמצאו זוגות ששיחקו יחד יותר מ-3 פעמים.</p>
        )}
      </section>

      {/* Completed Games Table */}
      <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Trophy className="text-yellow-500" /> היסטוריית משחקים
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="pb-3 font-medium">תאריך ושעה</th>
                <th className="pb-3 font-medium">סוג משחק</th>
                <th className="pb-3 font-medium">שחקן 1</th>
                <th className="pb-3 font-medium">שחקן 2</th>
                <th className="pb-3 font-medium">מנצח</th>
                <th className="pb-3 font-medium">משך זמן</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 20).map((log) => (
                <tr key={log.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-4 text-slate-600">
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="py-4 font-medium text-slate-800">{log.game_type}</td>
                  <td className="py-4 text-slate-700">{log.player1_name}</td>
                  <td className="py-4 text-slate-700">{log.player2_name}</td>
                  <td className="py-4">
                    {log.winner_id ? (
                      <span className="text-emerald-600 font-bold">
                        {log.winner_id === log.player1_id ? log.player1_name : log.player2_name}
                      </span>
                    ) : (
                      <span className="text-slate-400">תיקו / אין</span>
                    )}
                  </td>
                  <td className="py-4 text-slate-500">{log.duration_seconds} שניות</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <p className="text-center text-slate-500 py-8">אין היסטוריית משחקים.</p>
          )}
        </div>
      </section>
    </div>
  );
}
