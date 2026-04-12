import React, { useEffect, useRef, useState } from 'react';
import { Maze } from '../lib/maze';
import { Point, Direction } from '../types';

interface MazeCanvasProps {
  maze: Maze;
  mousePos: Point;
  mouseDir: Direction;
  viewportHeight: number;
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({ maze, mousePos, mouseDir, viewportHeight }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStartY, setCurrentStartY] = useState(0);
  const [cellSize, setCellSize] = useState(15);

  // Update cell size based on container width
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setCellSize(width / maze.width);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [maze.width]);

  // Stepped scrolling logic
  useEffect(() => {
    const targetStartY = Math.max(0, mousePos.y - Math.floor(viewportHeight / 2));
    const maxStartY = Math.max(0, maze.height - viewportHeight);
    const clampedTarget = Math.min(maxStartY, targetStartY);
    
    if (Math.abs(clampedTarget - currentStartY) >= 10 || clampedTarget === 0 || clampedTarget === maxStartY) {
      setCurrentStartY(Math.floor(clampedTarget / 10) * 10);
    }
  }, [mousePos.y, maze.height, viewportHeight, currentStartY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startY = currentStartY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Maze
    const drawHeight = Math.min(viewportHeight, maze.height - startY);
    for (let y = 0; y < drawHeight; y++) {
      const mazeY = startY + y;
      if (!maze.grid[mazeY]) continue;
      for (let x = 0; x < maze.width; x++) {
        ctx.fillStyle = maze.grid[mazeY][x] ? '#1a1a1a' : '#f0f0f0';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.5, cellSize + 0.5); // +0.5 to prevent gaps
      }
    }

    // Draw Start and End markers
    if (startY === 0) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.fillRect(0, 0, maze.width * cellSize, cellSize);
    }
    if (startY + viewportHeight >= maze.height) {
      const endY = (maze.height - 1 - startY) * cellSize;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(0, endY, maze.width * cellSize, cellSize);
    }

    // Draw Mouse
    const mouseViewY = (mousePos.y - startY) * cellSize;
    
    const drawMouseAt = (x: number) => {
      const mouseViewX = x * cellSize;
      ctx.save();
      ctx.translate(mouseViewX + cellSize / 2, mouseViewY + cellSize / 2);
      
      if (mouseDir === 'UP') ctx.rotate(0);
      else if (mouseDir === 'DOWN') ctx.rotate(Math.PI);
      else if (mouseDir === 'LEFT') ctx.rotate(-Math.PI / 2);
      else if (mouseDir === 'RIGHT') ctx.rotate(Math.PI / 2);

      const size = cellSize * 0.8;

      // Mouse Body
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, 0, size / 3, size / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mouse Ears
      ctx.beginPath();
      ctx.arc(-size / 4, -size / 4, size / 5, 0, Math.PI * 2);
      ctx.arc(size / 4, -size / 4, size / 5, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-size / 8, -size / 4, size / 10, 0, Math.PI * 2);
      ctx.arc(size / 8, -size / 4, size / 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(-size / 8, -size / 4, size / 20, 0, Math.PI * 2);
      ctx.arc(size / 8, -size / 4, size / 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // Draw main mouse and clones for periodic wrap-around
    drawMouseAt(mousePos.x);
    drawMouseAt(mousePos.x - maze.width);
    drawMouseAt(mousePos.x + maze.width);

  }, [maze, mousePos, mouseDir, viewportHeight, cellSize, currentStartY]);

  return (
    <div ref={containerRef} className="relative border-4 border-zinc-800 rounded-lg overflow-hidden shadow-2xl bg-zinc-900 w-full">
      <canvas
        ref={canvasRef}
        width={maze.width * cellSize}
        height={viewportHeight * cellSize}
        className="w-full block"
      />
    </div>
  );
};
