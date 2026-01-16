
export const GRID_SIZE = 8;

export const TILE_MAPPING: Record<string, number[]> = {
  // Connections for rotation 0: [Up, Right, Down, Left]
  'STRAIGHT': [1, 0, 1, 0], // |
  'ELBOW': [1, 1, 0, 0],    // └
  'TEE': [1, 1, 1, 0],      // ├
  'CROSS': [1, 1, 1, 1],    // +
  'BRIDGE': [1, 1, 1, 1],   // + (Physically connected all sides, logic handles separation)
  'SOURCE': [0, 1, 0, 0],   // Points Right
  'SINK': [0, 0, 0, 1],     // Accepts Left
  'BLOCK': [0, 0, 0, 0],
  'EMPTY': [0, 0, 0, 0],
  'DIODE': [1, 0, 1, 0]     
};

export const FLOW_COLOR = {
  NONE: 0,
  CYAN: 1,    // Bit 1
  MAGENTA: 2, // Bit 2
  WHITE: 3    // Bit 1 | Bit 2
};

export const STORAGE_KEY_STATS = 'flowstate_stats_v1';
export const STORAGE_KEY_STATE = 'flowstate_gamestate_v4'; // Version bump
export const STORAGE_KEY_THEME = 'flowstate_theme_cache_v1';
export const STORAGE_KEY_PROFILE = 'flowstate_profile_v1';
