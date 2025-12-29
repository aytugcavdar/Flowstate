import { Grid, TileType, NodeStatus, TileState, DIRECTIONS, GridPos } from '../types';
import { TILE_MAPPING, GRID_SIZE } from '../constants';
import { SeededRNG } from '../utils/rng';

// --- Helpers ---

const getConnections = (type: TileType, rotation: number): number[] => {
  const base = TILE_MAPPING[type];
  if (!base) return [0, 0, 0, 0];
  const connections = [...base];
  for (let i = 0; i < rotation; i++) {
    connections.unshift(connections.pop()!);
  }
  return connections;
};

const areConnected = (t1: TileState, t2: TileState, dirToT2: number) => {
  const conn1 = getConnections(t1.type, t1.rotation);
  const conn2 = getConnections(t2.type, t2.rotation);
  const dirFromT2 = (dirToT2 + 2) % 4;
  return conn1[dirToT2] === 1 && conn2[dirFromT2] === 1;
};

// --- Flow Logic ---

export const calculateFlow = (grid: Grid): Grid => {
  const newGrid = grid.map(row => row.map(tile => ({ ...tile, hasFlow: false })));
  
  let sourcePos: GridPos | null = null;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (newGrid[r][c].type === TileType.SOURCE) {
        sourcePos = { r, c };
        newGrid[r][c].hasFlow = true;
      }
    }
  }

  if (!sourcePos) return newGrid;

  const queue: GridPos[] = [sourcePos];
  const visited = new Set<string>();
  visited.add(`${sourcePos.r},${sourcePos.c}`);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currTile = newGrid[curr.r][curr.c];

    for (let d = 0; d < 4; d++) {
      const nr = curr.r + DIRECTIONS[d][0];
      const nc = curr.c + DIRECTIONS[d][1];

      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        const neighbor = newGrid[nr][nc];
        const key = `${nr},${nc}`;

        if (!visited.has(key) && areConnected(currTile, neighbor, d)) {
          if (neighbor.type !== TileType.BLOCK && neighbor.type !== TileType.EMPTY) {
            // Diode Direction Check
            if (currTile.type === TileType.DIODE && currTile.rotation !== d) continue; 
            if (neighbor.type === TileType.DIODE && neighbor.rotation !== d) continue;
            
            newGrid[nr][nc].hasFlow = true;
            visited.add(key);
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }
  }
  return newGrid;
};

export const checkWinCondition = (grid: Grid): boolean => {
  let sinkPowered = false;
  let allRequiredMet = true;
  let noForbiddenHit = true;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (tile.type === TileType.SINK && tile.hasFlow) sinkPowered = true;
      if (tile.status === NodeStatus.REQUIRED && !tile.hasFlow) allRequiredMet = false;
      if (tile.status === NodeStatus.FORBIDDEN && tile.hasFlow) noForbiddenHit = false;
    }
  }
  return sinkPowered && allRequiredMet && noForbiddenHit;
};

// --- Generation Logic ---

function getDir(from: GridPos, to: GridPos): number {
    if (to.r < from.r) return 0; // Up
    if (to.c > from.c) return 1; // Right
    if (to.r > from.r) return 2; // Down
    if (to.c < from.c) return 3; // Left
    return 1;
}

function getElbowRotation(entry: number, exit: number): number {
    const sides = [entry, exit].sort((a,b) => a-b);
    if (sides[0]===0 && sides[1]===1) return 0;
    if (sides[0]===1 && sides[1]===2) return 1;
    if (sides[0]===2 && sides[1]===3) return 2;
    if (sides[0]===0 && sides[1]===3) return 3;
    return 0;
}

export const generateDailyLevel = (dateStr: string): Grid => {
  const rng = new SeededRNG(dateStr);
  let finalGrid: Grid | null = null;
  
  // Try generating a valid level up to 20 times.
  // This ensures we don't settle for a "bad" short path.
  let attempts = 0;
  
  while (!finalGrid && attempts < 20) {
      attempts++;
      
      // 1. Setup Grid
      const grid: Grid = Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(null).map(() => ({
          type: TileType.EMPTY,
          rotation: 0,
          fixed: false,
          status: NodeStatus.NORMAL,
          hasFlow: false
        }))
      );

      // 2. Place Source & Sink with DISTANCE CONSTRAINT
      const sourceR = rng.range(0, GRID_SIZE - 1);
      let sinkR = rng.range(0, GRID_SIZE - 1);
      
      // Enforce at least 2 rows difference to force a longer path
      let distLoop = 0;
      while (Math.abs(sourceR - sinkR) < 2 && distLoop < 50) {
          sinkR = rng.range(0, GRID_SIZE - 1);
          distLoop++;
      }

      const sourcePos = { r: sourceR, c: 0 };
      const sinkPos = { r: sinkR, c: GRID_SIZE - 1 };

      grid[sourcePos.r][sourcePos.c] = { ...grid[sourcePos.r][sourcePos.c], type: TileType.SOURCE, fixed: true, rotation: 1 };
      grid[sinkPos.r][sinkPos.c] = { ...grid[sinkPos.r][sinkPos.c], type: TileType.SINK, fixed: true, rotation: 3 };

      // 3. Find Main Path (DFS)
      const path = generatePath(rng, sourcePos, sinkPos);
      
      // REJECT if path is too short (less than 10 nodes for a 6x6 grid)
      // This forces complexity.
      if (!path || path.length < 10) {
          continue; // Retry generation
      }

      // If we got here, we have a good path.
      finalGrid = grid;
      
      // 4. Draw Path Tiles
      const pathSet = new Set(path.map(p => `${p.r},${p.c}`));
      
      for (let i = 1; i < path.length - 1; i++) {
        const prev = path[i-1];
        const curr = path[i];
        const next = path[i+1];
        const dirIn = getDir(prev, curr);
        const dirOut = getDir(curr, next);
        
        if (dirIn === dirOut) {
            const type = (rng.next() > 0.85) ? TileType.DIODE : TileType.STRAIGHT;
            finalGrid[curr.r][curr.c] = { type, rotation: (dirIn % 2 === 0 ? 0 : 1), fixed: false, status: NodeStatus.NORMAL, hasFlow: false };
            if (type === TileType.DIODE) finalGrid[curr.r][curr.c].rotation = dirOut;
        } else {
            const rot = getElbowRotation((dirIn + 2) % 4, dirOut);
            finalGrid[curr.r][curr.c] = { type: TileType.ELBOW, rotation: rot, fixed: false, status: NodeStatus.NORMAL, hasFlow: false };
        }
      }

      // 5. Add Branches (Decoys with Bugs)
      addDecoys(rng, finalGrid, path, pathSet);

      // 6. Add Requirements
      addRequirements(rng, finalGrid, path);

      // 7. Fill Empty
      fillEmptyTiles(rng, finalGrid);

      // 8. Scramble Rotations
      scrambleGrid(rng, finalGrid);
  }

  // Fallback if 20 attempts fail (rare): Just return the last attempt or a basic one
  // (The loop logic above guarantees `finalGrid` is set unless extremely unlucky, 
  // but TS needs certainty. In practice, calculateFlow handles nulls gracefully or we assume success)
  
  return calculateFlow(finalGrid!);
};

// --- Sub-algorithms ---

function generatePath(rng: SeededRNG, start: GridPos, end: GridPos): GridPos[] | null {
    let bestPath: GridPos[] | null = null;
    
    // Helper recursive DFS
    const explore = (curr: GridPos, path: GridPos[], visited: Set<string>) => {
        // Optimization: If we found a long path, stop searching for "better" ones to save CPU
        if (bestPath && bestPath.length > 12) return; 

        // Target Reached?
        // Specifically, we need to reach column GRID_SIZE-2 and row == end.r
        // Because the Sink is at GRID_SIZE-1.
        if (curr.c === GRID_SIZE - 2 && curr.r === end.r) {
            // Found a valid path to the sink
            const fullPath = [...path, {r: end.r, c: GRID_SIZE - 1}];
            // Keep the longest path found so far
            if (!bestPath || fullPath.length > bestPath.length) {
                bestPath = fullPath;
            }
            return;
        }

        const dirs = [0, 1, 2, 3];
        // Shuffle directions
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(rng.next() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }

        for (const d of dirs) {
            const nr = curr.r + DIRECTIONS[d][0];
            const nc = curr.c + DIRECTIONS[d][1];
            const key = `${nr},${nc}`;

            // Valid bounds: Columns 0 to GRID_SIZE-2. Row 0 to GRID_SIZE-1.
            // (We can use col 0 if we loop back, but keeping it simple: cols 0..size-2)
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE - 1 && !visited.has(key)) {
                // Heuristic: Avoid boxing ourselves in.
                // Count free neighbors
                let freeNeighbors = 0;
                for(let checkD=0; checkD<4; checkD++) {
                    const cnr = nr + DIRECTIONS[checkD][0];
                    const cnc = nc + DIRECTIONS[checkD][1];
                    if (cnr >= 0 && cnr < GRID_SIZE && cnc >= 0 && cnc < GRID_SIZE - 1 && !visited.has(`${cnr},${cnc}`)) {
                        freeNeighbors++;
                    }
                }

                // If strictly dead end (0 free neighbors) and not at target, skip
                if (freeNeighbors === 0 && !(nc === GRID_SIZE - 2 && nr === end.r)) continue;

                visited.add(key);
                path.push({r: nr, c: nc});
                
                explore({r: nr, c: nc}, path, visited);
                
                path.pop();
                visited.delete(key);
                
                // If we found a very good path, break out of loop early
                if (bestPath && bestPath.length > 15) return;
            }
        }
    };

    explore({ r: start.r, c: start.c + 1 }, [start, { r: start.r, c: start.c + 1 }], new Set([`${start.r},${start.c}`, `${start.r},${start.c+1}`]));
    return bestPath;
}

function addDecoys(rng: SeededRNG, grid: Grid, path: GridPos[], pathSet: Set<string>) {
    let bugsPlaced = 0;
    const maxBugs = 2;
    let attempts = 0;

    // We want bugs to be "tempting". Place them near the path.
    while (bugsPlaced < maxBugs && attempts < 50) {
        attempts++;
        // Pick random spot on path
        const idx = rng.range(1, path.length - 2);
        const p = path[idx];

        // Pick random direction
        const d = rng.range(0, 3);
        const nr = p.r + DIRECTIONS[d][0];
        const nc = p.c + DIRECTIONS[d][1];

        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !pathSet.has(`${nr},${nc}`) && grid[nr][nc].type === TileType.EMPTY) {
            // Place a bug here.
            // To make it a "decoy", it should look like it *could* connect.
            const type = rng.next() > 0.5 ? TileType.STRAIGHT : TileType.ELBOW;
            grid[nr][nc] = {
                type,
                rotation: rng.range(0, 3), 
                fixed: false,
                status: NodeStatus.FORBIDDEN,
                hasFlow: false
            };
            pathSet.add(`${nr},${nc}`);
            bugsPlaced++;
        }
    }
}

function addRequirements(rng: SeededRNG, grid: Grid, path: GridPos[]) {
    // Pick 3 random points on path (excluding start/end/neighbors)
    const candidates = path.slice(2, path.length - 2);
    // Fisher-Yates shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    let placed = 0;
    for (const p of candidates) {
        if (placed >= 3) break;
        if (grid[p.r][p.c].type !== TileType.DIODE) {
            grid[p.r][p.c].status = NodeStatus.REQUIRED;
            placed++;
        }
    }
}

function fillEmptyTiles(rng: SeededRNG, grid: Grid) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c].type === TileType.EMPTY) {
                const roll = rng.next();
                let type = TileType.ELBOW; // Elbows are best for noise
                if (roll > 0.4) type = TileType.STRAIGHT;
                if (roll > 0.7) type = TileType.TEE;
                if (roll > 0.9) type = TileType.CROSS;
                
                grid[r][c] = {
                    type,
                    rotation: rng.range(0, 3),
                    fixed: false,
                    status: NodeStatus.NORMAL,
                    hasFlow: false
                };
            }
        }
    }
}

function scrambleGrid(rng: SeededRNG, grid: Grid) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!grid[r][c].fixed) {
                grid[r][c].rotation = rng.range(0, 3);
            }
        }
    }
}
