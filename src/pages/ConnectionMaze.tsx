import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { generateMaze, Cell } from '../utils/mazeGenerator';
import MazeRenderer from '../components/MazeRenderer';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

const ConnectionMaze: React.FC = () => {
  const { user } = useAuth();
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [players, setPlayers] = useState<{ id: string; x: number; y: number; name: string; keys: string[] }[]>([]);
  const [chatStatus, setChatStatus] = useState<'open' | 'cooldown'>('open');
  const [startTime] = useState(Date.now());
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalTime, setFinalTime] = useState('');
  const [timer, setTimer] = useState(0);
  const [message, setMessage] = useState('');

  // בדיקת קרבה להחלפה
  const isAdjacent = players.length === 2 && 
    Math.abs(players[0].x - players[1].x) + Math.abs(players[0].y - players[1].y) === 1;

  const handleTrade = () => {
    // לוגיקת החלפה (גבר ורוד, אישה כחול)
    setPlayers(prev => prev.map(p => {
      if (p.id === 'male_id' && p.keys.includes('key_pink')) return { ...p, keys: p.keys.filter(k => k !== 'key_pink').concat('key_blue') };
      if (p.id === 'female_id' && p.keys.includes('key_blue')) return { ...p, keys: p.keys.filter(k => k !== 'key_blue').concat('key_pink') };
      return p;
    }));
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
    if (chatStatus !== 'open') return;
    // שליחת הודעה...
    setChatStatus('cooldown');
    setTimer(8);
  };

  const collectClock = () => {
    setChatStatus('open');
    setTimer(10);
  };

  useEffect(() => {
    setMaze(generateMaze(15, 15));
    
    // האזנה לשינויים במיקומי שחקנים
    const channel = supabase.channel('maze-game')
      .on('broadcast', { event: 'player_moved' }, ({ payload }) => {
        setPlayers(prev => prev.map(p => p.id === payload.id ? payload : p));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const movePlayer = async (dx: number, dy: number) => {
    if (!user) return;
    
    setPlayers(prev => {
      const p = prev.find(p => p.id === user.id) || { id: user.id, x: 1, y: 1, name: user.full_name || 'שחקן', keys: [] };
      const newX = Math.max(0, Math.min(maze[0].length - 1, p.x + dx));
      const newY = Math.max(0, Math.min(maze.length - 1, p.y + dy));
      
      if (maze[newY][newX].type === 'wall') return prev;
      
      const newPlayer = { ...p, x: newX, y: newY };
      const cell = maze[newY][newX];

      // לוגיקת איסוף חפצים
      if (['key_blue', 'key_pink', 'clock'].includes(cell.type)) {
        if (cell.type === 'clock') collectClock();
        // הסרת הפריט מהמפה (סנכרון לכולם)
        supabase.channel('maze-game').send({
          type: 'broadcast',
          event: 'item_collected',
          payload: { x: newX, y: newY }
        });
        // עדכון מקומי של המפה
        setMaze(prev => prev.map(row => row.map(c => c.x === newX && c.y === newY ? { ...c, type: 'path' } : c)));
      }

      // לוגיקת דלתות
      if (cell.type === 'door_blue' && !p.keys.includes('key_blue')) return prev; // חסימה
      
      // שליחת המיקום החדש לכל השחקנים
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
            {/* ... צ'אט ... */}
          </div>
        </>
      )}
    </div>
  );
};

export default ConnectionMaze;
