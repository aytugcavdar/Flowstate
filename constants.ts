export const GRID_SIZE = 6;

export const TILE_MAPPING: Record<string, number[]> = {
  // Connections for rotation 0: [Up, Right, Down, Left] (1 = connect, 0 = no)
  'STRAIGHT': [1, 0, 1, 0], // |
  'ELBOW': [1, 1, 0, 0],    // └
  'TEE': [1, 1, 1, 0],      // ├
  'CROSS': [1, 1, 1, 1],    // +
  'SOURCE': [0, 1, 0, 0],   // Points Right initially
  'SINK': [0, 0, 0, 1],     // Accepts Left initially
  'BLOCK': [0, 0, 0, 0],
  'EMPTY': [0, 0, 0, 0],
  'DIODE': [1, 0, 1, 0]     // Physically like Straight, flow logic handled separately
};

export const STORAGE_KEY_STATS = 'flowstate_stats_v1';
export const STORAGE_KEY_STATE = 'flowstate_gamestate_v1';
export const STORAGE_KEY_THEME = 'flowstate_theme_cache_v1';