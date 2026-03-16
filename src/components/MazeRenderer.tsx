import React from 'react';
import { Cell } from '../utils/mazeGenerator';

interface MazeRendererProps {
  maze: Cell[][];
  players: { id: string; x: number; y: number; name: string }[];
}

const MazeRenderer: React.FC<MazeRendererProps> = ({ maze, players }) => {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${maze[0].length}, minmax(0, 1fr))` }}>
      {maze.flat().map((cell, i) => (
        <div
          key={i}
          className={`w-8 h-8 flex items-center justify-center rounded ${
            cell.type === 'wall' ? 'bg-slate-800' : 'bg-slate-100'
          }`}
        >
          {cell.type === 'key_blue' && <div className="w-4 h-4 bg-blue-500 rounded-full" />}
          {cell.type === 'door_blue' && <div className="w-6 h-6 bg-blue-800" />}
          {cell.type === 'clock' && <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-bold">⏱️</div>}
          
          {/* רינדור שחקנים */}
          {players.map(p => (
            p.x === cell.x && p.y === cell.y && (
              <div key={p.id} className="w-6 h-6 bg-red-500 rounded-full animate-pulse z-10" />
            )
          ))}
        </div>
      ))}
    </div>
  );
};

export default MazeRenderer;
