import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, ArrowUp, ArrowDown, RotateCcw, RotateCw, Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateMaze, Cell } from '../utils/mazeGenerator';
import RaycastingRenderer from '../components/RaycastingRenderer';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';

interface Player {
  id: string;
  x: number;
  y: number;
  angle: number;
  name: string;
  keys: string[];
  gender?: 'male' | 'female';
}

const ConnectionMaze: React.FC = () => {
  const { user } = useAuth();
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameMode, setGameMode] = useState<'competitive' | 'cooperative'>('cooperative');
  const [chatStatus, setChatStatus] = useState<'open' | 'cooldown'>('open');
  const [startTime] = useState(Date.now());
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalTime, setFinalTime] = useState('');
  const [timer, setTimer] = useState(0);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([]);
  const [showExplosion, setShowExplosion] = useState(false);

  // בדיקת קרבה להחלפה
  const isAdjacent = players.length >= 2 && (() => {
    const me = players.find(p => p.id === user?.id);
    const other = players.find(p => p.id !== user?.id);
    if (!me || !other) return false;
    return Math.sqrt(Math.pow(me.x - other.x, 2) + Math.pow(me.y - other.y, 2)) < 1.5;
  })();

  const handleTrade = () => {
    if (!user) return;
    const me = players.find(p => p.id === user.id);
    const other = players.find(p => p.id !== user.id);
    if (!me || !other) return;

    const newPlayers = players.map(p => {
      if (p.id === user.id) return { ...p, keys: other.keys };
      if (p.id === other.id) return { ...p, keys: me.keys };
      return p;
    });

    setPlayers(newPlayers);
    
    supabase.channel('maze-game').send({
      type: 'broadcast',
      event: 'trade_keys',
      payload: { players: newPlayers }
    });
    
    toast.success('המפתחות הוחלפו!');
  };

  const checkFinish = async (x: number, y: number) => {
    const mapX = Math.floor(x);
    const mapY = Math.floor(y);
    if (maze[mapY][mapX].type === 'door_blue' || maze[mapY][mapX].type === 'door_pink') {
      const duration = (Date.now() - startTime) / 1000;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      setShowExplosion(true);
      setTimeout(() => {
        setFinalTime(timeStr);
        setIsGameOver(true);
      }, 2000);

      if (user) {
        const otherPlayer = players.find(p => p.id !== user.id);
        await dataService.logGame({
          player1_id: user.id,
          player1_name: user.full_name || 'שחקן',
          player2_id: otherPlayer?.id || 'unknown',
          player2_name: otherPlayer?.name || 'unknown',
          game_type: 'Maze',
          winner_id: user.id,
          duration_seconds: Math.floor(duration)
        });

        const globalChannel = supabase.channel('global_game_events');
        globalChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            globalChannel.send({
              type: 'broadcast',
              event: 'game_end',
              payload: { gameId: 'maze_game' }
            });
            supabase.removeChannel(globalChannel);
          }
        });
      }

      await dataService.saveGameResult({
        game_type: 'individuals',
        duration: timeStr,
        players: players.map(p => p.id),
        created_at: new Date().toISOString()
      });
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else {
      if (chatStatus === 'open') {
        setChatStatus('cooldown');
        setTimer(8);
      } else {
        setChatStatus('open');
        setTimer(0);
      }
    }
    return () => clearInterval(interval);
  }, [timer, chatStatus]);

  const sendMessage = () => {
    if (chatStatus !== 'open' || !message.trim() || !user) return;
    const newMessage = { sender: user.full_name || 'שחקן', text: message };
    setChatMessages(prev => [...prev, newMessage]);
    supabase.channel('maze-game').send({
      type: 'broadcast',
      event: 'chat_message',
      payload: newMessage
    });
    setMessage('');
    setChatStatus('cooldown');
    setTimer(8);
  };

  const collectClock = () => {
    setChatStatus('open');
    setTimer(10);
    toast.success('קיבלתם עוד זמן לצ׳אט!');
  };

  useEffect(() => {
    if (!user) return;
    
    setMaze(generateMaze(15, 15));
    
    const initialPlayer: Player = { 
      id: user.id, 
      x: 1.5, 
      y: 1.5, 
      angle: 0,
      name: user.full_name || 'שחקן', 
      keys: [],
      gender: user.gender || undefined
    };
    setPlayers([initialPlayer]);

    const channel = supabase.channel('maze-game')
      .on('broadcast', { event: 'player_moved' }, ({ payload }) => {
        setPlayers(prev => {
          const exists = prev.find(p => p.id === payload.id);
          if (!exists && prev.length === 1) {
            const globalChannel = supabase.channel('global_game_events');
            globalChannel.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                globalChannel.send({
                  type: 'broadcast',
                  event: 'game_start',
                  payload: {
                    gameId: 'maze_game',
                    player1Name: prev[0].name,
                    player2Name: payload.name,
                    gameType: 'Maze'
                  }
                });
                supabase.removeChannel(globalChannel);
              }
            });
          }
          if (exists) return prev.map(p => p.id === payload.id ? payload : p);
          return [...prev, payload];
        });
      })
      .on('broadcast', { event: 'item_collected' }, ({ payload }) => {
        setMaze(prev => prev.map(row => row.map(c => c.x === payload.x && c.y === payload.y ? { ...c, type: 'path' } : c)));
      })
      .on('broadcast', { event: 'trade_keys' }, ({ payload }) => {
        setPlayers(payload.players);
        toast.success('המפתחות הוחלפו על ידי השחקן השני!');
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        setChatMessages(prev => [...prev, payload]);
      })
      .subscribe();

    channel.send({
      type: 'broadcast',
      event: 'player_moved',
      payload: initialPlayer
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const movePlayer = useCallback((dist: number) => {
    if (!user || isGameOver) return;
    
    setPlayers(prev => {
      const p = prev.find(p => p.id === user.id);
      if (!p) return prev;

      const nextX = p.x + Math.cos(p.angle) * dist;
      const nextY = p.y + Math.sin(p.angle) * dist;
      
      const mapX = Math.floor(nextX);
      const mapY = Math.floor(nextY);
      
      if (mapX < 0 || mapX >= maze[0].length || mapY < 0 || mapY >= maze.length) return prev;
      
      const cell = maze[mapY][mapX];
      if (cell.type === 'wall') return prev;
      
      if (cell.type === 'door_blue' && !p.keys.includes('key_blue')) {
        toast.error('צריך מפתח כחול!');
        return prev;
      }
      if (cell.type === 'door_pink' && !p.keys.includes('key_pink')) {
        toast.error('צריך מפתח ורוד!');
        return prev;
      }
      
      const newKeys = [...p.keys];
      if (cell.type === 'key_blue' || cell.type === 'key_pink') {
        newKeys.push(cell.type);
        toast.success('מצאת מפתח!');
      }

      const newPlayer = { ...p, x: nextX, y: nextY, keys: newKeys };

      if (['key_blue', 'key_pink', 'clock'].includes(cell.type)) {
        if (cell.type === 'clock') collectClock();
        supabase.channel('maze-game').send({
          type: 'broadcast',
          event: 'item_collected',
          payload: { x: mapX, y: mapY }
        });
        setMaze(prevMaze => prevMaze.map(row => row.map(c => c.x === mapX && c.y === mapY ? { ...c, type: 'path' } : c)));
      }

      checkFinish(nextX, nextY);

      supabase.channel('maze-game').send({
        type: 'broadcast',
        event: 'player_moved',
        payload: newPlayer
      });
      
      return prev.map(pl => pl.id === user.id ? newPlayer : pl);
    });
  }, [user, isGameOver, maze]);

  const rotatePlayer = useCallback((angle: number) => {
    if (!user || isGameOver) return;
    setPlayers(prev => {
      const p = prev.find(p => p.id === user.id);
      if (!p) return prev;
      const newPlayer = { ...p, angle: p.angle + angle };
      supabase.channel('maze-game').send({
        type: 'broadcast',
        event: 'player_moved',
        payload: newPlayer
      });
      return prev.map(pl => pl.id === user.id ? newPlayer : pl);
    });
  }, [user, isGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') movePlayer(0.2);
      if (e.key === 'ArrowDown' || e.key === 's') movePlayer(-0.2);
      if (e.key === 'ArrowLeft' || e.key === 'a') rotatePlayer(-0.15);
      if (e.key === 'ArrowRight' || e.key === 'd') rotatePlayer(0.15);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, rotatePlayer]);

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white overflow-hidden">
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-black mb-6 text-center bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent">
          מבוך השידוכים 3D
        </h1>
        
        <div className="flex justify-center mb-4">
          <div className="bg-white/10 p-1 rounded-2xl backdrop-blur-md border border-white/20 flex gap-1">
            <button
              onClick={() => setGameMode('competitive')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${gameMode === 'competitive' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/50' : 'text-white/50 hover:bg-white/5'}`}
            >
              תחרותי
            </button>
            <button
              onClick={() => setGameMode('cooperative')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${gameMode === 'cooperative' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50' : 'text-white/50 hover:bg-white/5'}`}
            >
              שיתופי
            </button>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {showExplosion && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 5, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="relative">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    x: (Math.random() - 0.5) * 500, 
                    y: (Math.random() - 0.5) * 500,
                    rotate: Math.random() * 360,
                    opacity: 0
                  }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="absolute"
                >
                  <Heart className="text-pink-500 fill-pink-500" size={40} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isGameOver ? (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center bg-white/10 backdrop-blur-xl p-12 rounded-[3rem] shadow-2xl border border-white/20 max-w-md mx-auto"
        >
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles size={40} />
          </div>
          <h2 className="text-4xl font-black text-white mb-2">כל הכבוד!</h2>
          <p className="text-xl text-white/60 font-medium">סיימתם בזמן של {finalTime}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 w-full py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-white/90 transition-all shadow-lg"
          >
            שחק שוב
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          <div className="flex-1 w-full max-w-2xl">
            {maze.length > 0 && user && (
              <RaycastingRenderer maze={maze} players={players} localPlayerId={user.id} />
            )}
            
            {/* Controls */}
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="flex gap-4">
                <button 
                  onMouseDown={() => movePlayer(0.2)} 
                  className="p-6 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 border border-white/10"
                >
                  <ArrowUp size={32} />
                </button>
              </div>
              <div className="flex gap-4">
                <button 
                  onMouseDown={() => rotatePlayer(-0.15)} 
                  className="p-6 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 border border-white/10"
                >
                  <RotateCcw size={32} />
                </button>
                <button 
                  onMouseDown={() => movePlayer(-0.2)} 
                  className="p-6 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 border border-white/10"
                >
                  <ArrowDown size={32} />
                </button>
                <button 
                  onMouseDown={() => rotatePlayer(0.15)} 
                  className="p-6 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 border border-white/10"
                >
                  <RotateCw size={32} />
                </button>
              </div>
              <p className="text-white/40 text-sm font-medium mt-2">השתמש בחיצים או WASD כדי ללכת</p>
            </div>
          </div>

          <div className="w-full lg:w-80 space-y-6">
            {isAdjacent && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-purple-500/20 border border-purple-500/50 p-4 rounded-2xl text-center"
              >
                <p className="text-purple-300 font-bold mb-3">אתם קרובים!</p>
                <button 
                  onClick={handleTrade} 
                  className="w-full bg-purple-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-500/50 active:scale-95 transition-all"
                >
                  החלף מפתחות
                </button>
              </motion.div>
            )}
            
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white/80">צ׳אט זוגי</h3>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${chatStatus === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {chatStatus === 'open' ? 'פתוח' : `ממתין... (${timer}ש׳)`}
                </div>
              </div>
              
              <div className="h-48 overflow-y-auto mb-4 space-y-3 custom-scrollbar pr-2">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.sender === user?.full_name ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-white/30 mb-1">{msg.sender}</span>
                    <div className={`px-4 py-2 rounded-2xl text-sm ${msg.sender === user?.full_name ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-white/80 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-white/20 gap-2">
                    <Send size={24} />
                    <p className="text-sm">התחילו לדבר...</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={chatStatus === 'open' ? 'הקלד הודעה...' : 'ממתין...'}
                  disabled={chatStatus !== 'open'}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <button 
                  onClick={sendMessage}
                  disabled={chatStatus !== 'open'}
                  className="p-2 bg-blue-600 text-white rounded-xl disabled:opacity-50 hover:bg-blue-500 transition-all active:scale-95"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionMaze;
