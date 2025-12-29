export enum TileType {
  EMPTY = 'EMPTY',
  STRAIGHT = 'STRAIGHT',
  ELBOW = 'ELBOW',
  TEE = 'TEE',
  CROSS = 'CROSS',
  SOURCE = 'SOURCE',
  SINK = 'SINK',
  BLOCK = 'BLOCK', // An obstacle
  DIODE = 'DIODE' // One-way valve
}

export enum NodeStatus {
  NORMAL = 'NORMAL',
  REQUIRED = 'REQUIRED', // Must have flow
  FORBIDDEN = 'FORBIDDEN', // Must NOT have flow ("Bug")
}

export interface GridPos {
  r: number;
  c: number;
}

export interface TileState {
  type: TileType;
  rotation: number; // 0, 1, 2, 3 (multiples of 90)
  fixed: boolean; // Cannot rotate (Source/Sink/Blocks)
  status: NodeStatus;
  hasFlow: boolean; // Is currently powered
  flowDelay: number; // Animation delay in ms based on distance from source
}

export type Grid = TileState[][];

export interface GameState {
  grid: Grid;
  moves: number;
  isWon: boolean;
  gameDate: string; // YYYY-MM-DD
}

export interface DailyStats {
  streak: number;
  lastPlayed: string;
  history: Record<string, number>; // date -> moves
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

// Map directions to grid changes [dr, dc]
// 0: Up, 1: Right, 2: Down, 3: Left
export const DIRECTIONS = [
  [-1, 0], // Up
  [0, 1],  // Right
  [1, 0],  // Down
  [0, -1]  // Left
];