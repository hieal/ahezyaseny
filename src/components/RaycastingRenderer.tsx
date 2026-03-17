import React, { useRef, useEffect } from 'react';
import { Cell } from '../utils/mazeGenerator';

interface Player {
  id: string;
  x: number;
  y: number;
  angle: number;
  name: string;
  gender?: 'male' | 'female';
  keys: string[];
}

interface RaycastingRendererProps {
  maze: Cell[][];
  players: Player[];
  localPlayerId: string;
}

const RaycastingRenderer: React.FC<RaycastingRendererProps> = ({ maze, players, localPlayerId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const me = players.find(p => p.id === localPlayerId);
    if (!me) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const fov = Math.PI / 3;
      const numRays = width;
      const stepAngle = fov / numRays;

      // Draw Floor and Ceiling
      ctx.fillStyle = '#0f172a'; // Dark ceiling
      ctx.fillRect(0, 0, width, height / 2);
      ctx.fillStyle = '#1e293b'; // Darker floor
      ctx.fillRect(0, height / 2, width, height / 2);

      const zBuffer: number[] = new Array(numRays).fill(Infinity);

      // Raycasting
      for (let i = 0; i < numRays; i++) {
        const rayAngle = me.angle - fov / 2 + i * stepAngle;
        let distance = 0;
        let hitWall = false;
        let wallType = 'wall';

        const eyeX = Math.cos(rayAngle);
        const eyeY = Math.sin(rayAngle);

        while (!hitWall && distance < 20) {
          distance += 0.05;
          const testX = Math.floor(me.x + eyeX * distance);
          const testY = Math.floor(me.y + eyeY * distance);

          if (testX < 0 || testX >= maze[0].length || testY < 0 || testY >= maze.length) {
            hitWall = true;
            distance = 20;
          } else {
            const cell = maze[testY][testX];
            if (cell.type === 'wall' || cell.type.startsWith('door')) {
              hitWall = true;
              wallType = cell.type;
            }
          }
        }

        // Fix fisheye
        const correctedDistance = distance * Math.cos(rayAngle - me.angle);
        zBuffer[i] = correctedDistance;

        const wallHeight = height / correctedDistance;
        
        // Wall Color with Fog
        let wallColor = '#3b82f6'; // Blue
        if (wallType === 'door_pink') wallColor = '#ec4899'; // Pink
        if (wallType === 'door_blue') wallColor = '#2563eb'; // Darker Blue
        
        // Apply Fog
        const fogAmount = Math.min(1, correctedDistance / 10);
        ctx.globalAlpha = 1 - fogAmount;
        
        ctx.fillStyle = wallColor;
        ctx.fillRect(i, (height - wallHeight) / 2, 1, wallHeight);
        
        // Add some depth shading
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        if (Math.floor(me.x + eyeX * distance * 10) % 2 === 0) {
           ctx.fillRect(i, (height - wallHeight) / 2, 1, wallHeight);
        }
        
        ctx.globalAlpha = 1;
      }

      // Sprites (Other Players, Items)
      const sprites: { x: number; y: number; char: string; color: string; isHeart?: boolean }[] = [];
      
      // Other players
      players.forEach(p => {
        if (p.id !== localPlayerId) {
          sprites.push({ x: p.x, y: p.y, char: '👤', color: p.gender === 'female' ? '#f472b6' : '#60a5fa' });
        }
      });

      // Items in maze
      maze.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell.type === 'key_blue') sprites.push({ x: x + 0.5, y: y + 0.5, char: '🔑', color: '#3b82f6' });
          if (cell.type === 'key_pink') sprites.push({ x: x + 0.5, y: y + 0.5, char: '🔑', color: '#ec4899' });
          if (cell.type === 'clock') sprites.push({ x: x + 0.5, y: y + 0.5, char: '⏰', color: '#fbbf24' });
          if (cell.type === 'door_blue' || cell.type === 'door_pink') {
             sprites.push({ x: x + 0.5, y: y + 0.5, char: '❤️', color: '#ef4444', isHeart: true });
          }
        });
      });

      // Sort sprites by distance
      sprites.sort((a, b) => {
        const distA = Math.pow(me.x - a.x, 2) + Math.pow(me.y - a.y, 2);
        const distB = Math.pow(me.x - b.x, 2) + Math.pow(me.y - b.y, 2);
        return distB - distA;
      });

      sprites.forEach(s => {
        const dx = s.x - me.x;
        const dy = s.y - me.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let spriteAngle = Math.atan2(dy, dx) - me.angle;
        if (spriteAngle < -Math.PI) spriteAngle += 2 * Math.PI;
        if (spriteAngle > Math.PI) spriteAngle -= 2 * Math.PI;

        if (Math.abs(spriteAngle) < fov / 2 && dist > 0.1 && dist < 15) {
          const screenX = (0.5 * (spriteAngle / (fov / 2)) + 0.5) * width;
          const spriteHeight = height / dist;
          
          // Check Z-Buffer
          const rayIdx = Math.floor(screenX);
          if (rayIdx >= 0 && rayIdx < numRays && dist < zBuffer[rayIdx]) {
            ctx.font = `${spriteHeight}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Fog for sprites
            const fogAmount = Math.min(1, dist / 10);
            ctx.globalAlpha = 1 - fogAmount;
            
            if (s.isHeart) {
              // Glowing effect for heart
              ctx.shadowBlur = 20;
              ctx.shadowColor = s.color;
            }
            
            ctx.fillStyle = s.color;
            ctx.fillText(s.char, screenX, height / 2);
            
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
          }
        }
      });

      // Minimap
      const mapSize = 120;
      const cellSize = mapSize / maze.length;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(width - mapSize - 10, 10, mapSize, mapSize);
      
      maze.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell.type === 'wall') {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(width - mapSize - 10 + x * cellSize, 10 + y * cellSize, cellSize, cellSize);
          }
        });
      });

      // Players on minimap
      players.forEach(p => {
        ctx.fillStyle = p.id === localPlayerId ? '#10b981' : (p.gender === 'female' ? '#f472b6' : '#60a5fa');
        ctx.beginPath();
        ctx.arc(width - mapSize - 10 + p.x * cellSize, 10 + p.y * cellSize, 3, 0, Math.PI * 2);
        ctx.fill();
        
        if (p.id === localPlayerId) {
          // View direction
          ctx.strokeStyle = '#10b981';
          ctx.beginPath();
          ctx.moveTo(width - mapSize - 10 + p.x * cellSize, 10 + p.y * cellSize);
          ctx.lineTo(
            width - mapSize - 10 + p.x * cellSize + Math.cos(p.angle) * 10,
            10 + p.y * cellSize + Math.sin(p.angle) * 10
          );
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [maze, players, localPlayerId]);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800">
      <canvas 
        ref={canvasRef} 
        width={640} 
        height={400} 
        className="w-full h-auto bg-slate-900"
      />
      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        מבט גוף ראשון
      </div>
    </div>
  );
};

export default RaycastingRenderer;
