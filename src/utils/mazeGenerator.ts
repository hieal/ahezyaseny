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
      type: (x === 0 || x === width - 1 || y === 0 || y === height - 1) 
        ? 'wall' 
        : (Math.random() < 0.25 && x > 2 && y > 2) ? 'wall' : 'path',
      x,
      y
    }))
  );

  // הבטחת נתיב פנוי סביב השחקנים (התחלה ב-1,1)
  for (let i = 1; i <= 2; i++) {
    for (let j = 1; j <= 2; j++) {
      maze[i][j].type = 'path';
    }
  }

  // הוספת מפתחות, דלתות ושעונים אקראיים במיקומים אסטרטגיים
  maze[2][width - 3].type = 'key_blue';
  maze[height - 3][2].type = 'key_pink';
  
  maze[height - 2][width - 2].type = 'door_blue'; // נקודת סיום כחולה
  maze[height - 2][width - 3].type = 'door_pink'; // נקודת סיום ורודה
  
  maze[5][5].type = 'clock';
  maze[width - 6][height - 6].type = 'clock';
  maze[Math.floor(height/2)][Math.floor(width/2)].type = 'clock';

  return maze;
};
