export type Point = {
  x: number;
  y: number;
};

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type Difficulty = 'NOVICE' | 'BEGINNER' | 'EASY' | 'MEDIUM' | 'HARD' | 'INSANE';

export type ActivationFunction = 'tanh' | 'relu' | 'sigmoid';
export type RewardFunction = 'standard' | 'sparse' | 'shaping';

export interface MazeConfig {
  width: number;
  height: number;
  periodicX: boolean;
  difficulty: Difficulty;
}

export interface AgentState {
  pos: Point;
  dir: Direction;
  score: number;
  steps: number;
  isFinished: boolean;
}

export interface NeuralNetworkState {
  layers: number[][]; // Activations
  weights: number[][][]; // weights[layerIndex][fromNeuron][toNeuron]
}

export interface TrainingMetrics {
  episode: number;
  totalReward: number;
  steps: number;
  success: boolean;
}
