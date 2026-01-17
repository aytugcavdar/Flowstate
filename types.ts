
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

// --- Mission Types ---

export type MissionType = 'SPEED' | 'MOVES' | 'NO_HINT' | 'BONUS_NODES';

export interface DailyMission {
  id: string;
  type: MissionType;
  target: number; // e.g. 30 (seconds), 25 (moves)
  xpReward: number;
  description: string; // Key for translation
}

export interface DailyStats {
  streak: number;
  lastPlayed: string;
  history: Record<string, number>;
  completedMissions: string[]; // IDs of missions completed today
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

// --- Progression Types ---

export interface Badge {
  id: string;
  icon: string;
}

export interface PlayerProfile {
  totalWins: number;
  fastestWinMs: number;
  consecutiveNoHintWins: number;
  badges: string[]; // IDs of unlocked badges
  xp: number; // NEW: Total Experience Points
  level: number; // NEW: Current Level
}

// --- Campaign Types ---

export interface CampaignLevel {
  id: string;
  seed: string; // The seed used for level generation
  parMoves: number; // Moves required for 3 stars
  title: string;
}

export interface CampaignChapter {
  id: string;
  title: string;
  description: string;
  requiredStars: number; // Stars needed to unlock this chapter
  levels: CampaignLevel[];
}

export interface CampaignProgress {
  unlockedChapters: string[];
  levelStars: Record<string, number>; // levelId -> stars (1, 2, 3)
}

export const DIRECTIONS = [
  [-1, 0], // Up
  [0, 1],  // Right
  [1, 0],  // Down
  [0, -1]  // Left
];
