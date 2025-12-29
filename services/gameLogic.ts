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
  // Reset flow and delay
  const newGrid = grid.map(row => row.map(tile => ({ ...tile, hasFlow: false, flowDelay: 0 })));
  
  let sourcePos: GridPos | null = null;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (newGrid[r][c].type === TileType.SOURCE) {
        sourcePos = { r, c };
        newGrid[r][c].hasFlow = true;
        newGrid[r][c].flowDelay = 0;
      }
    }
  }

  if (!sourcePos) return newGrid;

  // Queue stores pos and current distance/depth
  const queue: { pos: GridPos, depth: number }[] = [{ pos: sourcePos, depth: 0 }];
  const visited = new Set<string>();
  visited.add(`${sourcePos.r},${sourcePos.c}`);

  while (queue.length > 0) {
    const { pos: curr, depth } = queue.shift()!;
    const currTile = newGrid[curr.r][curr.c];

    for (let d = 0; d < 4; d++) {
      const nr = curr.r + DIRECTIONS[d][0];
      const nc = curr.c + DIRECTIONS[d][1];

      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        const neighbor = newGrid[nr][nc];
        const key = `${nr},${nc}`;

        if (!visited.has(key) && areConnected(currTile, neighbor, d)) {
          if (neighbor.type !== TileType.BLOCK && neighbor.type !== TileType.EMPTY) {
            
            // 1. If Current is Diode: It only allows flow in its specific rotation direction.
            if (currTile.type === TileType.DIODE) {
                if (currTile.rotation !== d) continue;
            }

            // 2. If Neighbor is Diode: It only accepts flow from its "back".
            if (neighbor.type === TileType.DIODE) {
                if (neighbor.rotation !== d) continue;
            }
            
            newGrid[nr][nc].hasFlow = true;
            // Delay increases by distance. 75ms per tile creates a nice "filling" wave.
            newGrid[nr][nc].flowDelay = (depth + 1) * 75; 
            
            visited.add(key);
            queue.push({ pos: { r: nr, c: nc }, depth: depth + 1 });
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
  
  let attempts = 0;
  
  while (!finalGrid && attempts < 20) {
      attempts++;
      
      const grid: Grid = Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(null).map(() => ({
          type: TileType.EMPTY,
          rotation: 0,
          fixed: false,
          status: NodeStatus.NORMAL,
          hasFlow: false,
          flowDelay: 0
        }))
      );

      const sourceR = rng.range(0, GRID_SIZE - 1);
      let sinkR = rng.range(0, GRID_SIZE - 1);
      
      let distLoop = 0;
      while (Math.abs(sourceR - sinkR) < 2 && distLoop < 50) {
          sinkR = rng.range(0, GRID_SIZE - 1);
          distLoop++;
      }

      const sourcePos = { r: sourceR, c: 0 };
      const sinkPos = { r: sinkR, c: GRID_SIZE - 1 };

      grid[sourcePos.r][sourcePos.c] = { ...grid[sourcePos.r][sourcePos.c], type: TileType.SOURCE, fixed: true, rotation: 0 };
      grid[sinkPos.r][sinkPos.c] = { ...grid[sinkPos.r][sinkPos.c], type: TileType.SINK, fixed: true, rotation: 0 };

      const path = generatePath(rng, sourcePos, sinkPos, grid);
      
      if (!path || path.length < 8) {
          continue; 
      }
      
      const pathSet = new Set(path.map(p => `${p.r},${p.c}`));
      
      for (let i = 1; i < path.length - 1; i++) {
        const prev = path[i-1];
        const curr = path[i];
        const next = path[i+1];
        const dirIn = getDir(prev, curr);
        const dirOut = getDir(curr, next);
        
        if (dirIn === dirOut) {
            const type = (rng.next() > 0.85) ? TileType.DIODE : TileType.STRAIGHT;
            const baseRotation = (dirIn % 2 === 0 ? 0 : 1);
            
            grid[curr.r][curr.c] = { 
                type, 
                rotation: baseRotation, 
                fixed: false, 
                status: NodeStatus.NORMAL, 
                hasFlow: false,
                flowDelay: 0
            };

            if (type === TileType.DIODE) {
                grid[curr.r][curr.c].rotation = dirOut;
            }

        } else {
            const rot = getElbowRotation((dirIn + 2) % 4, dirOut);
            grid[curr.r][curr.c] = { type: TileType.ELBOW, rotation: rot, fixed: false, status: NodeStatus.NORMAL, hasFlow: false, flowDelay: 0 };
        }
      }

      addDecoys(rng, grid, path, pathSet);
      addRequirements(rng, grid, path);
      fillEmptyTiles(rng, grid);

      const testFlow = calculateFlow(grid);
      const isSolvable = checkWinCondition(testFlow);

      if (!isSolvable) {
          continue; 
      }

      finalGrid = grid;
      scrambleGrid(rng, finalGrid);
  }

  if (!finalGrid) {
      finalGrid = createFallbackGrid();
  }
  
  return calculateFlow(finalGrid);
};

// --- Sub-algorithms ---

function generatePath(rng: SeededRNG, start: GridPos, end: GridPos, grid: Grid): GridPos[] | null {
    let bestPath: GridPos[] | null = null;
    let iterations = 0;
    const MAX_ITERATIONS = 2500;

    const explore = (curr: GridPos, path: GridPos[], visited: Set<string>) => {
        iterations++;
        if (iterations > MAX_ITERATIONS) return;
        if (bestPath && bestPath.length > 15) return; 

        if (curr.r === end.r && curr.c === end.c) {
            if (!bestPath || path.length > bestPath.length) {
                bestPath = [...path];
            }
            return;
        }

        if (curr.c === GRID_SIZE - 2 && curr.r === end.r) {
            const fullPath = [...path, {r: end.r, c: GRID_SIZE - 1}];
            if (!bestPath || fullPath.length > bestPath.length) {
                bestPath = fullPath;
            }
            return;
        }

        const dirs = [0, 1, 2, 3];
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(rng.next() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }

        for (const d of dirs) {
            const nr = curr.r + DIRECTIONS[d][0];
            const nc = curr.c + DIRECTIONS[d][1];
            const key = `${nr},${nc}`;

            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE - 1 && !visited.has(key)) {
                
                if (grid[nr][nc].type === TileType.SOURCE) continue;

                let freeNeighbors = 0;
                for(let checkD=0; checkD<4; checkD++) {
                    const cnr = nr + DIRECTIONS[checkD][0];
                    const cnc = nc + DIRECTIONS[checkD][1];
                    if (cnr >= 0 && cnr < GRID_SIZE && cnc >= 0 && cnc < GRID_SIZE - 1 && !visited.has(`${cnr},${cnc}`)) {
                        freeNeighbors++;
                    }
                }

                if (freeNeighbors === 0 && !(nc === GRID_SIZE - 2 && nr === end.r)) continue;

                visited.add(key);
                path.push({r: nr, c: nc});
                
                explore({r: nr, c: nc}, path, visited);
                
                path.pop();
                visited.delete(key);
            }
        }
    };

    explore({ r: start.r, c: start.c + 1 }, [start, { r: start.r, c: start.c + 1 }], new Set([`${start.r},${start.c}`, `${start.r},${start.c+1}`]));
    return bestPath;
}

function createFallbackGrid(): Grid {
    const grid: Grid = Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(null).map(() => ({
            type: TileType.EMPTY, rotation: 0, fixed: false, status: NodeStatus.NORMAL, hasFlow: false, flowDelay: 0
        }))
    );
    for(let c=0; c<GRID_SIZE; c++) {
        const type = (c===0)? TileType.SOURCE : (c===GRID_SIZE-1)? TileType.SINK : TileType.STRAIGHT;
        const fixed = (c===0 || c===GRID_SIZE-1);
        const rot = (c===0 || c===GRID_SIZE-1) ? 0 : 1;
        
        grid[2][c] = { type, rotation: rot, fixed, status: NodeStatus.NORMAL, hasFlow: false, flowDelay: 0 };
    }
    return grid;
}

function addDecoys(rng: SeededRNG, grid: Grid, path: GridPos[], pathSet: Set<string>) {
    let bugsPlaced = 0;
    const maxBugs = 2;
    let attempts = 0;

    while (bugsPlaced < maxBugs && attempts < 50) {
        attempts++;
        const idx = rng.range(1, path.length - 2);
        const p = path[idx];

        if (p.c < 1 || p.c > GRID_SIZE - 2) continue;

        const d = rng.range(0, 3);
        const nr = p.r + DIRECTIONS[d][0];
        const nc = p.c + DIRECTIONS[d][1];

        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !pathSet.has(`${nr},${nc}`) && grid[nr][nc].type === TileType.EMPTY) {
            if (nc === 0 || nc === GRID_SIZE - 1) continue;
            const type = rng.next() > 0.5 ? TileType.STRAIGHT : TileType.ELBOW;
            grid[nr][nc] = {
                type,
                rotation: rng.range(0, 3), 
                fixed: false,
                status: NodeStatus.FORBIDDEN,
                hasFlow: false,
                flowDelay: 0
            };
            pathSet.add(`${nr},${nc}`);
            bugsPlaced++;
        }
    }
}

function addRequirements(rng: SeededRNG, grid: Grid, path: GridPos[]) {
    const candidates = path.slice(2, path.length - 2);
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
                let type = TileType.ELBOW;
                if (roll > 0.4) type = TileType.STRAIGHT;
                if (roll > 0.7) type = TileType.TEE;
                if (roll > 0.9) type = TileType.CROSS;
                
                grid[r][c] = {
                    type,
                    rotation: rng.range(0, 3),
                    fixed: false,
                    status: NodeStatus.NORMAL,
                    hasFlow: false,
                    flowDelay: 0
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