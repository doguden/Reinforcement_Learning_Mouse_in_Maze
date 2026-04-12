import { Point, Difficulty } from '../types';

export class Maze {
  width: number;
  height: number;
  grid: boolean[][]; // true = wall, false = path
  difficulty: Difficulty;

  constructor(width: number, height: number, difficulty: Difficulty = 'MEDIUM') {
    this.width = width;
    this.height = height;
    this.difficulty = difficulty;
    this.grid = Array.from({ length: height }, () => Array(width).fill(true));
    this.generate();
  }

  private generate() {
    // Randomized Prim's Algorithm adapted for periodic X
    const startX = Math.floor(this.width / 2);
    const startY = 0;
    this.grid[startY][startX] = false;

    const walls: { x: number; y: number; px: number; py: number }[] = [];
    
    const addWalls = (x: number, y: number) => {
      const neighbors = [
        { x, y: y - 1 },
        { x, y: y + 1 },
        { x: (x - 1 + this.width) % this.width, y },
        { x: (x + 1) % this.width, y },
      ];

      neighbors.forEach(n => {
        if (n.y >= 0 && n.y < this.height) {
          if (this.grid[n.y][n.x]) {
            walls.push({ x: n.x, y: n.y, px: x, py: y });
          }
        }
      });
    };

    addWalls(startX, startY);

    while (walls.length > 0) {
      const index = Math.floor(Math.random() * walls.length);
      const { x, y, px, py } = walls.splice(index, 1)[0];

      if (this.grid[y][x]) {
        let pathCount = 0;
        const neighbors = [
          { nx: x, ny: y - 1 },
          { nx: x, ny: y + 1 },
          { nx: (x - 1 + this.width) % this.width, ny: y },
          { nx: (x + 1) % this.width, ny: y },
        ];

        neighbors.forEach(n => {
          if (n.ny >= 0 && n.ny < this.height && !this.grid[n.ny][n.nx]) {
            pathCount++;
          }
        });

        if (pathCount === 1) {
          this.grid[y][x] = false;
          addWalls(x, y);
        }
      }
    }

    // Ensure start and end are open
    this.grid[0][startX] = false;
    let endX = -1;
    for (let x = 0; x < this.width; x++) {
      if (!this.grid[this.height - 1][x]) {
        endX = x;
        break;
      }
    }
    
    if (endX === -1) {
      endX = Math.floor(Math.random() * this.width);
      let currentY = this.height - 1;
      while (currentY >= 0 && this.grid[currentY][endX]) {
        this.grid[currentY][endX] = false;
        currentY--;
      }
    }

    // Wall removal based on difficulty (Lower difficulty = Lower wall density = More open)
    let removalChance = 0;
    if (this.difficulty === 'NOVICE') removalChance = 0.85;
    else if (this.difficulty === 'BEGINNER') removalChance = 0.65;
    else if (this.difficulty === 'EASY') removalChance = 0.45;
    else if (this.difficulty === 'MEDIUM') removalChance = 0.25;
    else if (this.difficulty === 'HARD') removalChance = 0.1;
    else if (this.difficulty === 'INSANE') removalChance = 0.02;

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] && Math.random() < removalChance) {
          this.grid[y][x] = false;
        }
      }
    }
  }

  isWall(x: number, y: number): boolean {
    if (y < 0 || y >= this.height) return true;
    return this.grid[y][(x + this.width) % this.width];
  }

  getSensors(x: number, y: number): number[] {
    return [
      this.isWall(x, y - 1) ? 1 : 0,
      this.isWall(x, y + 1) ? 1 : 0,
      this.isWall(x - 1, y) ? 1 : 0,
      this.isWall(x + 1, y) ? 1 : 0,
    ];
  }
}
