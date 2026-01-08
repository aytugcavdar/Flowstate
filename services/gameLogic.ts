
import { Grid, TileType, NodeStatus, TileState, DIRECTIONS, GridPos } from '../types';
import { TILE_MAPPING, GRID_SIZE, FLOW_COLOR } from '../constants';
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

// --- Advanced Flow Logic (Color Mixing) ---

export const calculateFlow = (grid: Grid): Grid => {
  const newGrid = grid.map(row => row.map(tile => ({ 
    ...tile, 
    hasFlow: false, 
    flowColor: FLOW_COLOR.NONE,
    flowDelay: 0 
  })));
  
  const queue: { pos: GridPos, color: number, depth: number }[] = [];

  // 1. Locate Sources
  let sourcesFound = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (newGrid[r][c].type === TileType.SOURCE) {
        sourcesFound++;
        const color = sourcesFound === 1 ? FLOW_COLOR.CYAN : FLOW_COLOR.MAGENTA;
        
        newGrid[r][c].hasFlow = true;
        newGrid[r][c].flowColor = color;
        newGrid[r][c].flowDelay = 0;
        queue.push({ pos: { r, c }, color, depth: 0 });
      }
    }
  }

  // BFS with Color Mixing
  while (queue.length > 0) {
    const { pos: curr, color: incomingColor, depth } = queue.shift()!;
    const currTile = newGrid[curr.r][curr.c];

    for (let d = 0; d < 4; d++) {
      const nr = curr.r + DIRECTIONS[d][0];
      const nc = curr.c + DIRECTIONS[d][1];

      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        const neighbor = newGrid[nr][nc];
        const physicallyConnected = areConnected(currTile, neighbor, d);

        if (physicallyConnected) {
          if (neighbor.type !== TileType.BLOCK && neighbor.type !== TileType.EMPTY) {
            let colorToPropagate = incomingColor;

            const oldColor = newGrid[nr][nc].flowColor;
            const newColor = oldColor | colorToPropagate;

            if (newColor !== oldColor) {
                newGrid[nr][nc].hasFlow = true;
                newGrid[nr][nc].flowColor = newColor;
                newGrid[nr][nc].flowDelay = (depth + 1) * 75;
                queue.push({ pos: { r: nr, c: nc }, color: colorToPropagate, depth: depth + 1 });
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
  
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      if (tile.type === TileType.SINK) {
          if (tile.flowColor === FLOW_COLOR.WHITE) sinkCorrect = true;
      }
      if (tile.status === NodeStatus.REQUIRED && !tile.hasFlow) allRequiredMet = false;
      if (tile.status === NodeStatus.FORBIDDEN && tile.hasFlow) noForbiddenHit = false;
    }
  }
  return sinkCorrect && allRequiredMet && noForbiddenHit;
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

function getTeeRotation(sides: number[]): number {
    const all = new Set([0, 1, 2, 3]);
    sides.forEach(s => all.delete(s));
    const closed = Array.from(all)[0]; 
    
    if (closed === 3) return 0;
    if (closed === 0) return 1;
    if (closed === 1) return 2;
    if (closed === 2) return 3;
    return 0;
}

export const generateDailyLevel = (dateStr: string): Grid => {
  const rng = new SeededRNG(dateStr);
  let finalGrid: Grid | null = null;
  let attempts = 0;
  
  // Try up to 500 times.
  while (!finalGrid && attempts < 500) {
      attempts++;
      
      const grid: Grid = Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(null).map(() => ({
          type: TileType.EMPTY,
          rotation: 0,
          fixed: false,
          status: NodeStatus.NORMAL,
          hasFlow: false,
          flowColor: 0,
          flowDelay: 0
        }))
      );

      // 1. Place Sink & Sources
      const sinkPos = { r: rng.range(1, GRID_SIZE-2), c: GRID_SIZE - 1 };
      grid[sinkPos.r][sinkPos.c] = { ...grid[sinkPos.r][sinkPos.c], type: TileType.SINK, fixed: true };

      const srcAPos = { r: rng.range(0, 3), c: 0 };
      grid[srcAPos.r][srcAPos.c] = { ...grid[srcAPos.r][srcAPos.c], type: TileType.SOURCE, fixed: true };

      const srcBPos = { r: rng.range(4, 7), c: 0 };
      grid[srcBPos.r][srcBPos.c] = { ...grid[srcBPos.r][srcBPos.c], type: TileType.SOURCE, fixed: true };

      // 4. Merge Point 
      const mergeCol = rng.range(3, 5); 
      const mergeRow = rng.range(2, GRID_SIZE-3);
      const mergePos = { r: mergeRow, c: mergeCol };

      // 5-7. Paths
      const pathA = generateSimplePath(rng, srcAPos, mergePos, grid, 4);
      if (!pathA) continue;
      renderPath(grid, pathA, rng);

      const pathB = generateSimplePath(rng, srcBPos, mergePos, grid, 4);
      if (!pathB) continue;
      renderPath(grid, pathB, rng);

      const pathMix = generateSimplePath(rng, mergePos, sinkPos, grid, 3);
      if (!pathMix) continue;
      renderPath(grid, pathMix, rng);
      
      // Fix TEE Logic: Calculate required rotation based on neighbors
      const neighbors: number[] = [];
      // Path A Entry
      if (pathA.length >= 2) neighbors.push((getDir(pathA[pathA.length-2], mergePos) + 2) % 4);
      // Path B Entry
      if (pathB.length >= 2) neighbors.push((getDir(pathB[pathB.length-2], mergePos) + 2) % 4);
      // Path Mix Exit
      if (pathMix.length >= 2) neighbors.push(getDir(mergePos, pathMix[1]));
      
      // Filter valid and unique sides
      const uniqueSides = Array.from(new Set(neighbors));
      
      if (uniqueSides.length === 3) {
          grid[mergePos.r][mergePos.c].type = TileType.TEE;
          grid[mergePos.r][mergePos.c].rotation = getTeeRotation(uniqueSides);
      } else {
          // Fallback if geometry is weird (e.g. overlap)
          grid[mergePos.r][mergePos.c].type = TileType.CROSS;
      }

      // 8. Mechanics & Difficulty Check
      const fullPath = [...pathA, ...pathB, ...pathMix];
      const pathSet = new Set(fullPath.map(p => `${p.r},${p.c}`));
      
      if (pathSet.size < 18) continue;

      // 9. Honeypots
      generateDecoyPaths(rng, grid, fullPath);

      addMechanics(rng, grid, fullPath, pathSet);
      fillEmptyTiles(rng, grid);

      // Validate
      const testFlow = calculateFlow(grid);
      const isSolvable = checkWinCondition(testFlow);
      const reqCount = grid.flat().filter(t => t.status === NodeStatus.REQUIRED).length;

      if (isSolvable && reqCount >= 4) {
          finalGrid = grid;
          scrambleGrid(rng, finalGrid);
      }
  }

  if (!finalGrid) {
      const fallback = createFallbackGrid(rng);
      scrambleGrid(rng, fallback);
      return calculateFlow(fallback);
  }
  
  return calculateFlow(finalGrid);
};

function generateSimplePath(rng: SeededRNG, start: GridPos, end: GridPos, grid: Grid, minLength: number = 0): GridPos[] | null {
    let bestPath: GridPos[] | null = null;
    
    for(let i=0; i<40; i++) { 
        const path = [start];
        let curr = start;
        let stuck = false;
        const visited = new Set<string>([`${start.r},${start.c}`]);

        while(curr.r !== end.r || curr.c !== end.c) {
             const neighbors: GridPos[] = [];
             for(let d=0; d<4; d++) {
                const nr = curr.r + DIRECTIONS[d][0];
                const nc = curr.c + DIRECTIONS[d][1];
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited.has(`${nr},${nc}`)) {
                    if (grid[nr][nc].type !== TileType.EMPTY && (nr !== end.r || nc !== end.c)) continue;
                    neighbors.push({r: nr, c: nc});
                }
             }
             
             neighbors.sort((a,b) => {
                 const dA = Math.abs(a.r - end.r) + Math.abs(a.c - end.c);
                 const dB = Math.abs(b.r - end.r) + Math.abs(b.c - end.c);
                 return (dA - dB) * 0.3 + (rng.next() * 6 - 3);
             });

             if (neighbors.length === 0) { stuck = true; break; }
             
             curr = neighbors[0];
             path.push(curr);
             visited.add(`${curr.r},${curr.c}`);
             if (path.length > 50) { stuck = true; break; } 
        }

        if (!stuck) {
            if (path.length >= minLength) {
                bestPath = path;
                break;
            }
        }
    }
    return bestPath;
}

function generateDecoyPaths(rng: SeededRNG, grid: Grid, validPath: GridPos[]) {
    const decoyCount = rng.range(3, 5);
    let added = 0;
    
    const candidates = [...validPath].sort(() => rng.next() - 0.5);

    for (const start of candidates) {
        if (added >= decoyCount) break;

        const path = [start];
        let curr = start;
        const length = rng.range(3, 5);

        for (let i = 0; i < length; i++) {
            const neighbors: GridPos[] = [];
            for(let d=0; d<4; d++) {
                const nr = curr.r + DIRECTIONS[d][0];
                const nc = curr.c + DIRECTIONS[d][1];
                
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                    if (grid[nr][nc].type === TileType.EMPTY) {
                        neighbors.push({r: nr, c: nc});
                    }
                }
            }

            if (neighbors.length === 0) break;
            
            curr = neighbors[rng.range(0, neighbors.length - 1)];
            path.push(curr);
        }

        if (path.length > 2) {
            const decoySegments = path.slice(1);
            renderPath(grid, decoySegments, rng);
            
            const end = decoySegments[decoySegments.length - 1];
            grid[end.r][end.c].status = NodeStatus.FORBIDDEN; 
            
            added++;
        }
    }
}

function renderPath(grid: Grid, path: GridPos[], rng: SeededRNG) {
    for (let i = 0; i < path.length; i++) {
        const curr = path[i];
        if (grid[curr.r][curr.c].fixed) continue; 

        const prev = i > 0 ? path[i-1] : null;
        const next = i < path.length - 1 ? path[i+1] : null;

        if (prev && next) {
            const dirIn = getDir(prev, curr);
            const dirOut = getDir(curr, next);
            
            // CORRECTED LOGIC: 
            // dirIn is the direction flow travels (e.g. 1 Right).
            // But the tile needs to accept flow from the opposite side (e.g. 3 Left).
            const entrySide = (dirIn + 2) % 4;

            if (dirIn === dirOut) {
                if (rng.next() > 0.95) {
                    grid[curr.r][curr.c] = { ...grid[curr.r][curr.c], type: TileType.DIODE, rotation: dirIn % 2 };
                } else {
                    grid[curr.r][curr.c] = { ...grid[curr.r][curr.c], type: TileType.STRAIGHT, rotation: dirIn % 2 };
                }
            } else {
                const rot = getElbowRotation(entrySide, dirOut);
                grid[curr.r][curr.c] = { ...grid[curr.r][curr.c], type: TileType.ELBOW, rotation: rot };
            }
        } else if (prev && !next) {
            const dirIn = getDir(prev, curr);
            grid[curr.r][curr.c] = { ...grid[curr.r][curr.c], type: TileType.STRAIGHT, rotation: dirIn % 2 };
        } else if (!prev && next) {
             const dirOut = getDir(curr, next);
             grid[curr.r][curr.c] = { ...grid[curr.r][curr.c], type: TileType.STRAIGHT, rotation: dirOut % 2 };
        }
    }
}

function addMechanics(rng: SeededRNG, grid: Grid, fullPath: GridPos[], pathSet: Set<string>) {
    // 1. Required Nodes
    const requiredCandidates = fullPath.filter(p => {
        const t = grid[p.r][p.c];
        return t.status === NodeStatus.NORMAL && !t.fixed && t.type !== TileType.BRIDGE;
    });

    for (let i = requiredCandidates.length - 1; i > 0; i--) {
        const j = rng.range(0, i);
        [requiredCandidates[i], requiredCandidates[j]] = [requiredCandidates[j], requiredCandidates[i]];
    }

    let requiredPlaced = 0;
    const targetRequired = 4;
    
    while(requiredPlaced < targetRequired && requiredCandidates.length > 0) {
        const p = requiredCandidates.pop()!;
        grid[p.r][p.c].status = NodeStatus.REQUIRED;
        requiredPlaced++;
    }

    // 2. Bridges
    for(let k=0; k<2; k++) {
        const r = rng.range(1, GRID_SIZE-2);
        const c = rng.range(1, GRID_SIZE-2);
        if (grid[r][c].type === TileType.EMPTY) {
            grid[r][c] = {
                type: TileType.BRIDGE,
                rotation: 0,
                fixed: false,
                status: NodeStatus.NORMAL,
                hasFlow: false, flowColor: 0, flowDelay: 0
            };
        }
    }

    // 3. Locks & Keys
    const availablePath = fullPath.filter(p => grid[p.r][p.c].status === NodeStatus.NORMAL);
    
    if (availablePath.length > 5) {
        const keyIdx = Math.floor(availablePath.length * 0.2);
        const lockIdx = Math.floor(availablePath.length * 0.8);
        const keyPos = availablePath[keyIdx];
        const lockPos = availablePath[lockIdx];
        
        if (keyPos && lockPos) {
            grid[keyPos.r][keyPos.c].status = NodeStatus.KEY;
            grid[lockPos.r][lockPos.c].status = NodeStatus.LOCKED;
            grid[lockPos.r][lockPos.c].fixed = true;
        }
    }

    // 4. Capacitor
    let capPlaced = false;
    let attempts = 0;
    while(!capPlaced && attempts < 10) {
        attempts++;
        const r = rng.range(0, GRID_SIZE-1);
        const c = rng.range(0, GRID_SIZE-1);
        if (grid[r][c].type !== TileType.EMPTY && !grid[r][c].fixed && !pathSet.has(`${r},${c}`) && grid[r][c].status === NodeStatus.NORMAL) {
            grid[r][c].status = NodeStatus.CAPACITOR;
            capPlaced = true;
        }
    }
}

function createFallbackGrid(rng: SeededRNG): Grid {
    const templateId = rng.range(0, 2); 
    
    const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null).map(() => ({
        type: TileType.EMPTY, rotation: 0, fixed: false, status: NodeStatus.NORMAL, hasFlow: false, flowColor: 0, flowDelay: 0
    })));
    
    const set = (r: number, c: number, t: TileType, rot: number, fixed = false) => {
        grid[r][c] = { ...grid[r][c], type: t, rotation: rot, fixed };
    };

    if (templateId === 0) {
        set(1, 0, TileType.SOURCE, 0, true);
        set(1, 1, TileType.STRAIGHT, 1);
        set(1, 2, TileType.ELBOW, 2);
        set(2, 2, TileType.STRAIGHT, 0);
        set(5, 0, TileType.SOURCE, 0, true);
        set(5, 1, TileType.STRAIGHT, 1);
        set(5, 2, TileType.ELBOW, 3);
        set(4, 2, TileType.STRAIGHT, 0);
        set(3, 2, TileType.TEE, 0);
        set(3, 3, TileType.STRAIGHT, 1);
        set(3, 4, TileType.STRAIGHT, 1);
        set(3, 5, TileType.STRAIGHT, 1);
        set(3, 6, TileType.STRAIGHT, 1);
        set(3, 7, TileType.SINK, 3, true);
        grid[3][4].status = NodeStatus.REQUIRED;
        grid[1][1].status = NodeStatus.REQUIRED;
    } else if (templateId === 1) {
        set(0, 0, TileType.SOURCE, 0, true);
        set(0, 1, TileType.ELBOW, 2);
        set(1, 1, TileType.STRAIGHT, 0);
        set(2, 1, TileType.ELBOW, 3);
        set(2, 0, TileType.ELBOW, 0);
        set(3, 0, TileType.STRAIGHT, 0);
        set(4, 0, TileType.SOURCE, 0, true);
        set(4, 1, TileType.ELBOW, 3);
        set(3, 1, TileType.TEE, 0);
        set(3, 2, TileType.STRAIGHT, 1);
        set(3, 3, TileType.ELBOW, 2);
        set(4, 3, TileType.STRAIGHT, 0);
        set(5, 3, TileType.ELBOW, 3);
        set(5, 4, TileType.STRAIGHT, 1);
        set(5, 5, TileType.ELBOW, 0);
        set(4, 5, TileType.STRAIGHT, 0);
        set(3, 5, TileType.ELBOW, 1);
        set(3, 6, TileType.STRAIGHT, 1);
        set(3, 7, TileType.SINK, 3, true);
        grid[1][1].status = NodeStatus.REQUIRED;
        grid[4][3].status = NodeStatus.REQUIRED;
    } else {
        set(2, 0, TileType.SOURCE, 0, true);
        set(6, 0, TileType.SOURCE, 0, true);
        set(2, 1, TileType.STRAIGHT, 1);
        set(6, 1, TileType.STRAIGHT, 1);
        set(2, 2, TileType.ELBOW, 2);
        set(6, 2, TileType.ELBOW, 3);
        set(3, 2, TileType.STRAIGHT, 0);
        set(5, 2, TileType.STRAIGHT, 0);
        set(4, 2, TileType.TEE, 0);
        set(4, 3, TileType.STRAIGHT, 1);
        set(4, 4, TileType.ELBOW, 1);
        set(3, 4, TileType.ELBOW, 2);
        set(3, 5, TileType.STRAIGHT, 1);
        set(3, 6, TileType.ELBOW, 2);
        set(4, 6, TileType.ELBOW, 0);
        set(4, 7, TileType.SINK, 3, true);
        grid[3][5].status = NodeStatus.REQUIRED;
    }
    
    fillEmptyTiles(rng, grid);
    return grid;
}

function fillEmptyTiles(rng: SeededRNG, grid: Grid) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c].type === TileType.EMPTY) {
                const roll = rng.next();
                
                const isDiode = roll > 0.95; 
                const isCross = roll < 0.05; 
                const isTee = roll > 0.7 && roll < 0.9;
                
                let type = TileType.ELBOW; 
                
                if (isDiode) type = TileType.DIODE;
                else if (isCross) type = TileType.CROSS;
                else if (isTee) type = TileType.TEE;
                else if (roll > 0.6) type = TileType.STRAIGHT; 

                grid[r][c] = {
                    type: type,
                    rotation: rng.range(0, 3),
                    fixed: false,
                    status: NodeStatus.NORMAL,
                    hasFlow: false, flowColor: 0, flowDelay: 0
                };
            }
        }
    }
}

function scrambleGrid(rng: SeededRNG, grid: Grid) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!grid[r][c].fixed) {
                if (grid[r][c].type !== TileType.BLOCK) {
                    grid[r][c].rotation = rng.range(0, 3);
                }
            }
        }
    }
}
