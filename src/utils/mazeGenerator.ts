export type CellType = 'path' | 'wall' | 'door_blue' | 'door_pink' | 'key_blue' | 'key_pink' | 'hammer' | 'clock';

export interface Cell {
  type: CellType;
  x: number;
  y: number;
}

export const generateMaze = (width: number, height: number): Cell[][] => {
  // יצירת מבוך בסיסי (קירות מסביב וקירות פנימיים אקראיים)
  const maze: Cell[][] = Array(height).fill(null).map((_, y) =>
    Array(width).fill(null).map((_, x) => ({
      type: (x === 0 || x === width - 1 || y === 0 || y === height - 1 || Math.random() < 0.3) 
        ? 'wall' 
        : 'path',
      x,
      y
    }))
  );

  // הוספת מפתחות, דלתות ושעונים אקראיים
  maze[2][2].type = 'key_blue';
  maze[width - 3][height - 3].type = 'door_blue';
  maze[5][5].type = 'clock'; // הוספת שעון
  maze[width - 6][height - 6].type = 'clock'; // הוספת שעון נוסף

  return maze;
};
