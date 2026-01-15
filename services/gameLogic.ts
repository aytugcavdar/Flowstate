
import { Grid, TileType, NodeStatus, TileState, DIRECTIONS, GridPos } from '../types';
import { TILE_MAPPING, GRID_SIZE, FLOW_COLOR } from '../constants';

// --- Helpers ---

export const getConnections = (type: TileType, rotation: number): number[] => {
  const base = TILE_MAPPING[type];
  if (!base) return [0, 0, 0, 0];
  const connections = [...base];
  for (let i = 0; i < rotation; i++) {
    connections.unshift(connections.pop()!);
  }
  return connections;
};

export const areConnected = (t1: TileState, t2: TileState, dirToT2: number) => {
  const conn1 = getConnections(t1.type, t1.rotation);
  const conn2 = getConnections(t2.type, t2.rotation);
  const dirFromT2 = (dirToT2 + 2) % 4;
  return conn1[dirToT2] === 1 && conn2[dirFromT2] === 1;
};

// --- Advanced Flow Logic (Color Mixing) ---

export const calculateFlow = (grid: Grid): Grid => {
  const newGrid = grid.map(row => row.map(tile => ({ 
    ...tile, 
    hasFlow: false, 
    flowColor: FLOW_COLOR.NONE,
    flowDelay: 0 
  })));
  
  // Queue tracks entry direction to handle Bridges properly
  const queue: { pos: GridPos, color: number, depth: number, entryDir?: number }[] = [];
  const sources: GridPos[] = [];

  // 1. Locate Sources
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (newGrid[r][c].type === TileType.SOURCE) {
        sources.push({ r, c });
      }
    }
  }

  // Robust Color Assignment:
  // Sort sources by position (Row then Column).
  // 1st Source -> CYAN
  // 2nd Source -> MAGENTA
  // This guarantees distinct colors even if both are in the top half or close together.
  sources.sort((a, b) => a.r - b.r || a.c - b.c);

  sources.forEach((pos, index) => {
      // Modulo assignment guarantees alternating colors (1 Cyan, 1 Magenta) even if duplicate sources exist
      const color = index % 2 === 0 ? FLOW_COLOR.CYAN : FLOW_COLOR.MAGENTA;
      
      newGrid[pos.r][pos.c].hasFlow = true;
      newGrid[pos.r][pos.c].flowColor = color;
      newGrid[pos.r][pos.c].flowDelay = 0;
      queue.push({ pos, color, depth: 0, entryDir: undefined });
  });

  // BFS with Color Mixing
  while (queue.length > 0) {
    const { pos: curr, color: incomingColor, depth, entryDir } = queue.shift()!;
    const currTile = newGrid[curr.r][curr.c];

    for (let d = 0; d < 4; d++) {
      // Bridge Logic: Flow must continue on same axis
      if (currTile.type === TileType.BRIDGE && entryDir !== undefined) {
          const flowAxis = entryDir % 2; // 0=Vert, 1=Horz
          const exitAxis = d % 2;
          const bridgeAxis = currTile.rotation % 2; 
          if (bridgeAxis !== flowAxis) continue; 
          if (flowAxis !== exitAxis) continue; 
      }

      const nr = curr.r + DIRECTIONS[d][0];
      const nc = curr.c + DIRECTIONS[d][1];

      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        const neighbor = newGrid[nr][nc];
        const physicallyConnected = areConnected(currTile, neighbor, d);

        if (physicallyConnected) {
          // Diode Logic: Strict 4-way direction check
          if (neighbor.type === TileType.DIODE) {
             const diodePointingDir = neighbor.rotation;
             if (d !== diodePointingDir) continue;
          }

          if (neighbor.type !== TileType.BLOCK && neighbor.type !== TileType.EMPTY) {
            
            const oldColor = newGrid[nr][nc].flowColor;
            // Mix the incoming color with existing color
            const newColor = oldColor | incomingColor;

            // If we added a new color component (or first time visiting)
            if (newColor !== oldColor) {
                newGrid[nr][nc].hasFlow = true;
                newGrid[nr][nc].flowColor = newColor;
                newGrid[nr][nc].flowDelay = (depth + 1) * 75;
                
                const nextEntryDir = (d + 2) % 4; // Entry is opposite of exit
                
                queue.push({ 
                    pos: { r: nr, c: nc }, 
                    color: newColor, 
                    depth: depth + 1,
                    entryDir: nextEntryDir
                });
            }
          }
        }
      }
    }
  }
  return newGrid;
};

export const checkWinCondition = (grid: Grid): boolean => {
  let sinkCorrect = false;
  let allRequiredMet = true;
  let noForbiddenHit = true;
  let sourcesActive = 0;
  
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (tile.type === TileType.SINK) {
          // Sink must have WHITE color (3) to win
          if (tile.hasFlow && tile.flowColor === FLOW_COLOR.WHITE) sinkCorrect = true;
      }
      if (tile.type === TileType.SOURCE && tile.hasFlow) sourcesActive++;
      if (tile.status === NodeStatus.REQUIRED && !tile.hasFlow) allRequiredMet = false;
      if (tile.status === NodeStatus.FORBIDDEN && tile.hasFlow) noForbiddenHit = false;
    }
  }
  return sinkCorrect && sourcesActive >= 2 && allRequiredMet && noForbiddenHit;
};
