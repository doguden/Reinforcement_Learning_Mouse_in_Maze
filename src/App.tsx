import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Maze } from './lib/maze';
import { RLAgent } from './lib/agent';
import { MazeCanvas } from './components/MazeCanvas';
import { BrainVisualizer } from './components/BrainVisualizer';
import { Point, Direction, TrainingMetrics, Difficulty } from './types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Pause, RotateCcw, Brain, BarChart3, Settings2, Gauge } from 'lucide-react';

const MAZE_WIDTH = 30;
const VIEWPORT_HEIGHT = 60;

const DIFFICULTY_CONFIG = {
  NOVICE: { height: 120, label: 'Novice' },
  BEGINNER: { height: 120, label: 'Beginner' },
  EASY: { height: 120, label: 'Easy' },
  MEDIUM: { height: 120, label: 'Medium' },
  HARD: { height: 120, label: 'Hard' },
  INSANE: { height: 120, label: 'Insane' }
};

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [hiddenLayers, setHiddenLayers] = useState<number>(2);
  const [maze, setMaze] = useState(() => new Maze(MAZE_WIDTH, DIFFICULTY_CONFIG['MEDIUM'].height, 'MEDIUM'));
  const [agent, setAgent] = useState(() => new RLAgent([12, 8]));
  const [mousePos, setMousePos] = useState<Point>({ x: Math.floor(MAZE_WIDTH / 2), y: 0 });
  const [mouseDir, setMouseDir] = useState<Direction>('DOWN');
  const [isRunning, setIsRunning] = useState(false);
  const [speedValue, setSpeedValue] = useState(80); // 1-100 scale
  const speed = 510 - (speedValue * 5); // Map to 10-505ms delay
  const [metrics, setMetrics] = useState<TrainingMetrics[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [episodeReward, setEpisodeReward] = useState(0);
  const [steps, setSteps] = useState(0);

  // Helper for linear regression
  const getTrendLine = (data: any[], key: string) => {
    if (data.length < 10) return [];
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = data[i][key];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return data.map((d, i) => ({
      ...d,
      [`${key}Trend`]: slope * i + intercept
    }));
  };

  const metricsWithTrend = getTrendLine(getTrendLine(metrics, 'totalReward'), 'steps');

  const stateRef = useRef({
    mousePos: { x: Math.floor(MAZE_WIDTH / 2), y: 0 },
    mouseDir: 'DOWN' as Direction,
    episodeReward: 0,
    steps: 0,
    currentEpisode: 1
  });

  const lastStateRef = useRef<number[] | null>(null);
  const lastActionRef = useRef<number | null>(null);

  const resetEpisode = useCallback(() => {
    const newPos = { x: Math.floor(MAZE_WIDTH / 2), y: 0 };
    setMousePos(newPos);
    setMouseDir('DOWN');
    setEpisodeReward(0);
    setSteps(0);
    
    stateRef.current.mousePos = newPos;
    stateRef.current.mouseDir = 'DOWN';
    stateRef.current.episodeReward = 0;
    stateRef.current.steps = 0;
    
    lastStateRef.current = null;
    lastActionRef.current = null;
  }, []);

  const handleDifficultyChange = (newDiff: Difficulty) => {
    setDifficulty(newDiff);
    const newHeight = DIFFICULTY_CONFIG[newDiff].height;
    setMaze(new Maze(MAZE_WIDTH, newHeight, newDiff));
    resetEpisode();
    setMetrics([]);
    setCurrentEpisode(1);
    setIsRunning(false);
  };

  const handleDepthChange = (depth: number) => {
    setHiddenLayers(depth);
    const hiddenSizes = Array.from({ length: depth }, (_, i) => Math.max(4, 12 - i * 2));
    setAgent(new RLAgent(hiddenSizes));
    resetEpisode();
    setMetrics([]);
    setCurrentEpisode(1);
    setIsRunning(false);
  };

  const step = useCallback(() => {
    if (!maze || !agent || !agent.nn) return;

    const { mousePos: mPos, mouseDir: mDir, episodeReward: eReward, steps: sCount, currentEpisode: cEp } = stateRef.current;

    const sensors = maze.getSensors(mPos.x, mPos.y);
    const state = [...sensors, mPos.x / MAZE_WIDTH, mPos.y / maze.height];
    
    // Train on previous transition
    if (lastStateRef.current !== null && lastActionRef.current !== null && lastStateRef.current.length >= 6) {
      let reward = -1;
      if (mPos.y > (lastStateRef.current[5] * maze.height)) {
        reward += 2;
      }
      if (mPos.y === maze.height - 1) {
        reward += 500;
      }

      agent.update(lastStateRef.current, lastActionRef.current, reward, state, mPos.y === maze.height - 1);
      stateRef.current.episodeReward += reward;
      setEpisodeReward(stateRef.current.episodeReward);
    }

    // Choose next action
    const action = agent.getAction(state);
    lastStateRef.current = state;
    lastActionRef.current = action;

    let nextX = mPos.x;
    let nextY = mPos.y;
    let nextDir: Direction = mDir;

    if (action === 0) { nextY--; nextDir = 'UP'; }
    else if (action === 1) { nextY++; nextDir = 'DOWN'; }
    else if (action === 2) { nextX = (nextX - 1 + MAZE_WIDTH) % MAZE_WIDTH; nextDir = 'LEFT'; }
    else if (action === 3) { nextX = (nextX + 1) % MAZE_WIDTH; nextDir = 'RIGHT'; }

    // Check collision
    if (!maze.isWall(nextX, nextY)) {
      stateRef.current.mousePos = { x: nextX, y: nextY };
      stateRef.current.mouseDir = nextDir;
      setMousePos(stateRef.current.mousePos);
      setMouseDir(nextDir);
    } else {
      agent.update(state, action, -5, state, false);
      stateRef.current.episodeReward -= 5;
      setEpisodeReward(stateRef.current.episodeReward);
    }

    stateRef.current.steps += 1;
    setSteps(stateRef.current.steps);

    // Check end condition
    if (nextY === maze.height - 1 || stateRef.current.steps > 1500) {
      const success = nextY === maze.height - 1;
      const finalReward = stateRef.current.episodeReward;
      const finalSteps = stateRef.current.steps;
      
      setMetrics(prev => [...prev, {
        episode: cEp,
        totalReward: finalReward,
        steps: finalSteps,
        success
      }].slice(-50));
      
      stateRef.current.currentEpisode += 1;
      setCurrentEpisode(stateRef.current.currentEpisode);
      resetEpisode();
    }
  }, [agent, maze, resetEpisode]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(step, speed);
    return () => clearInterval(interval);
  }, [isRunning, speed, step]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column 1: Controls (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-amber-500">NeuroMaze</h1>
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">RL Training Lab</p>
          </div>

          {/* Difficulty Selector */}
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 space-y-3">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Gauge size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Difficulty</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(['NOVICE', 'BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'INSANE'] as Difficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => handleDifficultyChange(diff)}
                  className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition-all border text-left flex justify-between items-center ${
                    difficulty === diff 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  {DIFFICULTY_CONFIG[diff].label}
                  {difficulty === diff && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />}
                </button>
              ))}
            </div>
          </div>

          {/* NN Depth Selector */}
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 space-y-3">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <div className="flex items-center gap-2">
                <Settings2 size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Brain Depth</span>
              </div>
              <span className="text-xs font-mono text-amber-500">{hiddenLayers}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="5" 
              value={hiddenLayers} 
              onChange={(e) => handleDepthChange(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>

          {/* Speed & Play Controls */}
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Simulation Speed</span>
                <span className="text-[10px] font-mono text-zinc-500">{speedValue}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={speedValue} 
                onChange={(e) => setSpeedValue(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs uppercase transition-all ${
                  isRunning 
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                {isRunning ? <><Pause size={16} /> Stop</> : <><Play size={16} /> Start</>}
              </button>
              <button 
                onClick={() => {
                  setMaze(new Maze(MAZE_WIDTH, DIFFICULTY_CONFIG[difficulty].height, difficulty));
                  resetEpisode();
                  setMetrics([]);
                  setCurrentEpisode(1);
                }}
                className="p-3 bg-zinc-800 text-zinc-400 rounded-lg border border-zinc-700 hover:bg-zinc-700 transition-all"
                title="Reset Simulation"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: Maze (lg:col-span-3) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-widest">Live Environment</h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">30x120 GRID</span>
          </div>
          <MazeCanvas 
            maze={maze} 
            mousePos={mousePos} 
            mouseDir={mouseDir} 
            viewportHeight={VIEWPORT_HEIGHT} 
          />
        </div>

        {/* Column 3: Neural Network (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-2 text-zinc-400 px-1">
            <Brain size={16} className="text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Neural Activity (Real-time)</h2>
          </div>
          <div className="bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-sm shadow-2xl">
            <BrainVisualizer 
              nn={agent.nn} 
              inputs={maze ? [...maze.getSensors(mousePos.x, mousePos.y), mousePos.x / MAZE_WIDTH, mousePos.y / maze.height] : [0,0,0,0,0,0]} 
            />
          </div>
          
          {/* Reward Function Logic (Moved here to fill space) */}
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Reward System</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded bg-zinc-950 border border-emerald-500/20">
                <div className="text-[10px] font-bold text-emerald-500">+2.0</div>
                <div className="text-[8px] text-zinc-600 uppercase">Progress</div>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-blue-500/20">
                <div className="text-[10px] font-bold text-blue-500">-1.0</div>
                <div className="text-[8px] text-zinc-600 uppercase">Step</div>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-red-500/20">
                <div className="text-[10px] font-bold text-red-500">-5.0</div>
                <div className="text-[8px] text-zinc-600 uppercase">Wall</div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 4: Stats & Plots (lg:col-span-3) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-2 text-zinc-400 px-1">
            <BarChart3 size={16} className="text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Analytics</h2>
          </div>

          {/* Numerical Monitors */}
          <div className="grid grid-cols-1 gap-3">
            <StatCard label="Episode Reward" value={episodeReward.toFixed(1)} color="text-emerald-400" />
            <StatCard label="Steps Taken" value={steps} color="text-blue-400" />
            <StatCard label="Exploration (ε)" value={(agent.epsilon * 100).toFixed(0) + '%'} color="text-purple-400" />
          </div>

          {/* Plots */}
          <div className="space-y-4">
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 h-48 shadow-xl">
              <h3 className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest mb-2">Reward History</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.length >= 10 ? metricsWithTrend : metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="episode" stroke="#52525b" fontSize={8} tickFormatter={(v) => `E${v}`} />
                  <YAxis stroke="#52525b" fontSize={8} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="totalReward" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                  {metrics.length >= 10 && (
                    <Line type="monotone" dataKey="totalRewardTrend" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 h-48 shadow-xl">
              <h3 className="text-zinc-500 text-[9px] font-mono uppercase tracking-widest mb-2">Steps History</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.length >= 10 ? metricsWithTrend : metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="episode" stroke="#52525b" fontSize={8} tickFormatter={(v) => `E${v}`} />
                  <YAxis stroke="#52525b" fontSize={8} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="steps" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  {metrics.length >= 10 && (
                    <Line type="monotone" dataKey="stepsTrend" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 shadow-lg backdrop-blur-sm">
      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-wider">{label}</p>
      <p className={`text-2xl font-mono font-bold ${color}`}>{value}</p>
    </div>
  );
}
