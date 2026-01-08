
export enum TileType {
  EMPTY = 'EMPTY',
  STRAIGHT = 'STRAIGHT',
  ELBOW = 'ELBOW',
  TEE = 'TEE',
  CROSS = 'CROSS',
  BRIDGE = 'BRIDGE', // New: Overpass
  SOURCE = 'SOURCE',
  SINK = 'SINK',
  BLOCK = 'BLOCK', 
  DIODE = 'DIODE' 
}

export enum NodeStatus {
  NORMAL = 'NORMAL',
  REQUIRED = 'REQUIRED', 
  FORBIDDEN = 'FORBIDDEN', 
  LOCKED = 'LOCKED', 
  KEY = 'KEY',
  CAPACITOR = 'CAPACITOR' // New: Bonus ability
}

export interface GridPos {
  r: number;
  c: number;
}

export interface TileState {
  type: TileType;
  rotation: number; // 0, 1, 2, 3
  fixed: boolean; 
  status: NodeStatus;
  hasFlow: boolean; 
  flowColor: number; // 0=None, 1=Cyan, 2=Magenta, 3=White
  flowDelay: number; 
  id?: string; 
}

export type Grid = TileState[][];

export interface GameState {
  grid: Grid;
  moves: number;
  isWon: boolean;
  gameDate: string;
  charges: number; // For capacitor ability
}

export interface DailyStats {
  streak: number;
  lastPlayed: string;
  history: Record<string, number>; 
}

export interface DailyTheme {
  name: string;
  description: string;
  colorHex: string;
}

export interface WinAnalysis {
  rank: string;
  comment: string;
}

export const DIRECTIONS = [
  [-1, 0], // Up
  [0, 1],  // Right
  [1, 0],  // Down
  [0, -1]  // Left
];
