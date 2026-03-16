import React from 'react';
import { motion } from 'motion/react';
import { Cell } from '../utils/mazeGenerator';

interface MazeRendererProps {
  maze: Cell[][];
  players: { id: string; x: number; y: number; name: string; gender?: 'male' | 'female' }[];
}

const MazeRenderer: React.FC<MazeRendererProps> = ({ maze, players }) => {
  return (
    <div className="grid gap-1 p-2 bg-slate-200 rounded-xl shadow-inner" style={{ gridTemplateColumns: `repeat(${maze[0].length}, minmax(0, 1fr))` }}>
      {maze.flat().map((cell, i) => (
        <div
          key={i}
          className={`w-8 h-8 flex items-center justify-center rounded-sm transition-all duration-300 ${
            cell.type === 'wall' ? 'bg-slate-800 shadow-md' : 'bg-white'
          }`}
        >
          {cell.type === 'key_blue' && <div className="text-blue-500 animate-bounce">🔑</div>}
          {cell.type === 'key_pink' && <div className="text-pink-500 animate-bounce">🔑</div>}
          {cell.type === 'door_blue' && <div className="text-2xl">🚪🟦</div>}
          {cell.type === 'door_pink' && <div className="text-2xl">🚪🌸</div>}
          {cell.type === 'clock' && <div className="text-xl animate-pulse">⏱️</div>}
          
          {/* רינדור שחקנים */}
          {players.map(p => (
            p.x === cell.x && p.y === cell.y && (
              <motion.div 
                key={p.id} 
                layoutId={`player-${p.id}`}
                className={`w-6 h-6 rounded-full border-2 border-white shadow-lg z-10 flex items-center justify-center text-[10px] font-bold text-white ${
                  p.gender === 'male' ? 'bg-blue-500' : p.gender === 'female' ? 'bg-pink-500' : 'bg-purple-500'
                }`}
              >
                {p.name[0]}
              </motion.div>
            )
          ))}
        </div>
      ))}
    </div>
  );
};

export default MazeRenderer;
