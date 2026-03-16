import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateMaze, Cell } from '../utils/mazeGenerator';
import MazeRenderer from '../components/MazeRenderer';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

const ConnectionMaze: React.FC = () => {
  const { user } = useAuth();
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [players, setPlayers] = useState<{ id: string; x: number; y: number; name: string; keys: string[]; gender?: 'male' | 'female' }[]>([]);
  const [chatStatus, setChatStatus] = useState<'open' | 'cooldown'>('open');
  const [startTime] = useState(Date.now());
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalTime, setFinalTime] = useState('');
  const [timer, setTimer] = useState(0);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([]);

  // בדיקת קרבה להחלפה
  const isAdjacent = players.length >= 2 && (() => {
    const me = players.find(p => p.id === user?.id);
    const other = players.find(p => p.id !== user?.id);
    if (!me || !other) return false;
    return Math.abs(me.x - other.x) + Math.abs(me.y - other.y) === 1;
  })();

  const handleTrade = () => {
    if (!user) return;
    const me = players.find(p => p.id === user.id);
    const other = players.find(p => p.id !== user.id);
    if (!me || !other) return;

    // לוגיקת החלפה (גבר ורוד, אישה כחול)
    const newPlayers = players.map(p => {
      if (p.id === user.id) {
        // אם אני גבר ויש לי מפתח ורוד, אני נותן אותו ומקבל כחול (או להיפך)
        // לצורך הפשטות: מחליפים את כל המפתחות
        return { ...p, keys: other.keys };
      }
      if (p.id === other.id) {
        return { ...p, keys: me.keys };
      }
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

  // בדיקת סיום משחק
  const checkFinish = async (x: number, y: number) => {
    if (maze[y][x].type === 'door_blue' || maze[y][x].type === 'door_pink') { // נקודת סיום
      const duration = (Date.now() - startTime) / 1000;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setFinalTime(timeStr);
      setIsGameOver(true);

      // שמירת תוצאה
      await supabase.from('game_results').insert({
        game_type: 'individuals', // או לפי הלוגיקה
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
    
    // הוספת השחקן הנוכחי
    const initialPlayer = { 
      id: user.id, 
      x: 1, 
      y: 1, 
      name: user.full_name || 'שחקן', 
      keys: [],
      gender: user.gender || undefined
    };
    setPlayers([initialPlayer]);

    // האזנה לשינויים
    const channel = supabase.channel('maze-game')
      .on('broadcast', { event: 'player_moved' }, ({ payload }) => {
        setPlayers(prev => {
          const exists = prev.find(p => p.id === payload.id);
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

    // שליחת נוכחות
    channel.send({
      type: 'broadcast',
      event: 'player_moved',
      payload: initialPlayer
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const movePlayer = async (dx: number, dy: number) => {
    if (!user || isGameOver) return;
    
    let moved = false;
    setPlayers(prev => {
      const p = prev.find(p => p.id === user.id);
      if (!p) return prev;

      const newX = Math.max(0, Math.min(maze[0].length - 1, p.x + dx));
      const newY = Math.max(0, Math.min(maze.length - 1, p.y + dy));
      
      const cell = maze[newY][newX];
      if (cell.type === 'wall') return prev;
      
      // לוגיקת דלתות
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

      const newPlayer = { ...p, x: newX, y: newY, keys: newKeys };
      moved = true;

      // לוגיקת איסוף חפצים
      if (['key_blue', 'key_pink', 'clock'].includes(cell.type)) {
        if (cell.type === 'clock') collectClock();
        
        supabase.channel('maze-game').send({
          type: 'broadcast',
          event: 'item_collected',
          payload: { x: newX, y: newY }
        });
        
        setMaze(prevMaze => prevMaze.map(row => row.map(c => c.x === newX && c.y === newY ? { ...c, type: 'path' } : c)));
      }

      // בדיקת סיום
      checkFinish(newX, newY);

      // שליחת המיקום החדש
      supabase.channel('maze-game').send({
        type: 'broadcast',
        event: 'player_moved',
        payload: newPlayer
      });
      
      return prev.map(pl => pl.id === user.id ? newPlayer : pl);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') movePlayer(0, -1);
      if (e.key === 'ArrowDown') movePlayer(0, 1);
      if (e.key === 'ArrowLeft') movePlayer(-1, 0);
      if (e.key === 'ArrowRight') movePlayer(1, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maze, user]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">מבוך השידוכים (Connection Maze)</h1>
      
      {isGameOver ? (
        <div className="text-center bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-3xl font-bold text-green-600">כל הכבוד!</h2>
          <p className="text-xl mt-4">סיימתם בזמן של {finalTime}</p>
        </div>
      ) : (
        <>
          {maze.length > 0 && (
            <div className="flex justify-center">
              <MazeRenderer maze={maze} players={players} />
            </div>
          )}
          
          {isAdjacent && (
            <div className="flex justify-center mt-4">
              <button onClick={handleTrade} className="bg-purple-500 text-white px-6 py-2 rounded-full font-bold">החלף מפתחות (Trade)</button>
            </div>
          )}
          
          <div className="mt-6 bg-white p-4 rounded-xl shadow-md max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700">צ׳אט זוגי</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${chatStatus === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {chatStatus === 'open' ? 'פתוח' : `ממתין... (${timer}ש׳)`}
              </div>
            </div>
            
            <div className="h-40 overflow-y-auto mb-4 space-y-2 border-b pb-4 custom-scrollbar">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === user?.full_name ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-slate-400">{msg.sender}</span>
                  <div className={`px-3 py-1.5 rounded-2xl text-sm ${msg.sender === user?.full_name ? 'bg-luxury-blue text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatMessages.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">התחילו לדבר...</p>}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={chatStatus === 'open' ? 'הקלד הודעה...' : 'צריך להמתין...'}
                disabled={chatStatus !== 'open'}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-luxury-blue/20"
              />
              <button 
                onClick={sendMessage}
                disabled={chatStatus !== 'open'}
                className="p-2 bg-luxury-blue text-white rounded-xl disabled:opacity-50 transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConnectionMaze;
