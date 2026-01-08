
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
  // Reset flow, delays, and colors
  const newGrid = grid.map(row => row.map(tile => ({ 
    ...tile, 
    hasFlow: false, 
    flowColor: FLOW_COLOR.NONE,
    flowDelay: 0 
  })));
  
  // Queue stores pos, incoming color, and depth
  const queue: { pos: GridPos, color: number, depth: number }[] = [];

  // 1. Locate Sources
  // Source 1 (Top usually) = Cyan, Source 2 (Bottom usually) = Magenta
  let sourcesFound = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (newGrid[r][c].type === TileType.SOURCE) {
        sourcesFound++;
        // Arbitrary assignment: First source found is Cyan, second is Magenta
        // If map generation places top first, Top=Cyan.
        const color = sourcesFound === 1 ? FLOW_COLOR.CYAN : FLOW_COLOR.MAGENTA;
        
        newGrid[r][c].hasFlow = true;
        newGrid[r][c].flowColor = color;
        newGrid[r][c].flowDelay = 0;
        queue.push({ pos: { r, c }, color, depth: 0 });
      }
    }
  }

  // BFS with Color Mixing
  // We allow re-visiting nodes if we bring a *new* color component to them.
  
  // Track visited state as bits: 0=None, 1=Visited by Cyan, 2=Visited by Magenta, 3=Both
  const visitedMap = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));

  while (queue.length > 0) {
    const { pos: curr, color: incomingColor, depth } = queue.shift()!;
    const currTile = newGrid[curr.r][curr.c];

    // Propagate to neighbors
    for (let d = 0; d < 4; d++) {
      const nr = curr.r + DIRECTIONS[d][0];
      const nc = curr.c + DIRECTIONS[d][1];

      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        const neighbor = newGrid[nr][nc];
        const physicallyConnected = areConnected(currTile, neighbor, d);

        if (physicallyConnected) {
          if (neighbor.type !== TileType.BLOCK && neighbor.type !== TileType.EMPTY) {
            
            // Diode Check
            if (currTile.type === TileType.DIODE && currTile.rotation !== d) continue;
            if (neighbor.type === TileType.DIODE && neighbor.rotation !== d) continue;

            // Determine Outgoing Color
            let colorToPropagate = incomingColor;

            // Update Neighbor
            const oldColor = newGrid[nr][nc].flowColor;
            
            // Check if we are adding new color info
            // (e.g. tile has 1, we bring 2 -> new is 3. We bring 1 -> no change)
            const newColor = oldColor | colorToPropagate;

            if (newColor !== oldColor) {
                newGrid[nr][nc].hasFlow = true;
                newGrid[nr][nc].flowColor = newColor;
                newGrid[nr][nc].flowDelay = (depth + 1) * 75;
                
                // Add to queue to propagate this new color blend
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
      
      // Sink needs WHITE (3)
      if (tile.type === TileType.SINK) {
          if (tile.flowColor === FLOW_COLOR.WHITE) sinkCorrect = true;
      }
      
      // Required needs ANY flow (Cyan, Magenta or White)
      if (tile.status === NodeStatus.REQUIRED && !tile.hasFlow) allRequiredMet = false;
      
      // Forbidden must have NO flow
      if (tile.status === NodeStatus.FORBIDDEN && tile.hasFlow) noForbiddenHit = false;
    }
  }
  return sinkCorrect && allRequiredMet && noForbiddenHit;
};

// --- Generation Logic (Y-Shape Merge) ---

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
  
  // Increased attempts significantly to ensure valid hard levels
  while (!finalGrid && attempts < 200) {
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

      // 1. Place Sink (Right side)
      const sinkPos = { r: rng.range(1, GRID_SIZE-2), c: GRID_SIZE - 1 };
      grid[sinkPos.r][sinkPos.c] = { ...grid[sinkPos.r][sinkPos.c], type: TileType.SINK, fixed: true };

      // 2. Place Source A (Cyan) - Top Left
      const srcAPos = { r: rng.range(0, 3), c: 0 };
      grid[srcAPos.r][srcAPos.c] = { ...grid[srcAPos.r][srcAPos.c], type: TileType.SOURCE, fixed: true };

      // 3. Place Source B (Magenta) - Bottom Left
      const srcBPos = { r: rng.range(4, 7), c: 0 };
      grid[srcBPos.r][srcBPos.c] = { ...grid[srcBPos.r][srcBPos.c], type: TileType.SOURCE, fixed: true };

      // 4. Determine Merge Point (Somewhere in the middle columns)
      const mergeCol = rng.range(2, 5);
      const mergeRow = rng.range(1, GRID_SIZE-2);
      const mergePos = { r: mergeRow, c: mergeCol };

      // 5. Generate Path A: Source A -> Merge Point
      const pathA = generateSimplePath(rng, srcAPos, mergePos, grid);
      if (!pathA) continue;
      renderPath(grid, pathA, rng);

      // 6. Generate Path B: Source B -> Merge Point
      const pathB = generateSimplePath(rng, srcBPos, mergePos, grid);
      if (!pathB) continue;
      renderPath(grid, pathB, rng);

      // 7. Generate Mixed Path: Merge Point -> Sink
      const pathMix = generateSimplePath(rng, mergePos, sinkPos, grid);
      if (!pathMix) continue;
      renderPath(grid, pathMix, rng);
      
      // Ensure the merge point is a TEE or CROSS
      if (grid[mergePos.r][mergePos.c].type === TileType.ELBOW || grid[mergePos.r][mergePos.c].type === TileType.STRAIGHT) {
          grid[mergePos.r][mergePos.c].type = TileType.TEE;
          grid[mergePos.r][mergePos.c].rotation = rng.range(0,3);
      }

      // 8. Add Mechanics
      const fullPath = [...pathA, ...pathB, ...pathMix];
      const pathSet = new Set(fullPath.map(p => `${p.r},${p.c}`));
      
      addMechanics(rng, grid, fullPath, pathSet);
      fillEmptyTiles(rng, grid);

      // Validate Solvability
      const testFlow = calculateFlow(grid);
      const isSolvable = checkWinCondition(testFlow);

      if (isSolvable) {
          finalGrid = grid;
          scrambleGrid(rng, finalGrid);
      }
  }

  if (!finalGrid) {
      // Use the main RNG (seeded with dateStr) to generate the fallback
      // This ensures fallback is consistent for a date/seed but varies between seeds
      const fallback = createFallbackGrid(rng);
      scrambleGrid(rng, fallback);
      return calculateFlow(fallback);
  }
  
  return calculateFlow(finalGrid);
};

// Simplified pathfinder that respects existing non-empty tiles slightly
function generateSimplePath(rng: SeededRNG, start: GridPos, end: GridPos, grid: Grid): GridPos[] | null {
    let bestPath: GridPos[] | null = null;
    
    // Simple random walk with bias
    for(let i=0; i<10; i++) {
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
                    // Don't overwrite Sources/Sink unless it's the target
                    if (grid[nr][nc].type !== TileType.EMPTY && (nr !== end.r || nc !== end.c)) continue;
                    neighbors.push({r: nr, c: nc});
                }
             }
             
             // Bias to target
             neighbors.sort((a,b) => {
                 const dA = Math.abs(a.r - end.r) + Math.abs(a.c - end.c);
                 const dB = Math.abs(b.r - end.r) + Math.abs(b.c - end.c);
                 return (dA - dB) + (rng.next() * 2 - 1);
             });

             if (neighbors.length === 0) { stuck = true; break; }
             
             curr = neighbors[0];
             path.push(curr);
             visited.add(`${curr.r},${curr.c}`);
             if (path.length > 25) { stuck = true; break; }
        }

        if (!stuck) {
            bestPath = path;
            break;
        }
    }
    return bestPath;
}

function renderPath(grid: Grid, path: GridPos[], rng: SeededRNG) {
    for (let i = 0; i < path.length; i++) {
        const curr = path[i];
        if (grid[curr.r][curr.c].fixed) continue; // Don't overwrite endpoints

        const prev = i > 0 ? path[i-1] : null;
        const next = i < path.length - 1 ? path[i+1] : null;

        if (prev && next) {
            const dirIn = getDir(prev, curr);
            const dirOut = getDir(curr, next);
            if (dirIn === dirOut) {
                grid[curr.r][curr.c] = { ...grid[curr.r][curr.c], type: TileType.STRAIGHT, rotation: dirIn % 2 };
            } else {
                const rot = getElbowRotation((dirIn + 2) % 4, dirOut);
                grid[curr.r][curr.c] = { ...grid[curr.r][curr.c], type: TileType.ELBOW, rotation: rot };
            }
        }
    }
}

function addMechanics(rng: SeededRNG, grid: Grid, fullPath: GridPos[], pathSet: Set<string>) {
    // 1. Bridges (Visual mostly in this iteration, effectively Crosses)
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

    // 2. Capacitor (Bonus)
    let capPlaced = false;
    let attempts = 0;
    while(!capPlaced && attempts < 10) {
        attempts++;
        const r = rng.range(0, GRID_SIZE-1);
        const c = rng.range(0, GRID_SIZE-1);
        if (grid[r][c].type !== TileType.EMPTY && !grid[r][c].fixed && !pathSet.has(`${r},${c}`)) {
            grid[r][c].status = NodeStatus.CAPACITOR;
            capPlaced = true;
        }
    }

    // 3. Bugs - INCREASED to 6
    for(let k=0; k<6; k++) {
        const r = rng.range(0, GRID_SIZE-1);
        const c = rng.range(0, GRID_SIZE-1);
        if (grid[r][c].type === TileType.EMPTY && !pathSet.has(`${r},${c}`)) {
            grid[r][c] = {
                type: TileType.ELBOW, 
                rotation: rng.range(0,3),
                fixed: false,
                status: NodeStatus.FORBIDDEN,
                hasFlow: false, flowColor: 0, flowDelay: 0
            };
        }
    }
    
    // 4. Locks & Keys
    const keyPos = fullPath[Math.floor(fullPath.length * 0.3)];
    if(keyPos && grid[keyPos.r][keyPos.c].status === NodeStatus.NORMAL) {
        grid[keyPos.r][keyPos.c].status = NodeStatus.KEY;
    }
    const lockPos = fullPath[Math.floor(fullPath.length * 0.8)];
    if(lockPos && grid[lockPos.r][lockPos.c].status === NodeStatus.NORMAL) {
        grid[lockPos.r][lockPos.c].status = NodeStatus.LOCKED;
        grid[lockPos.r][lockPos.c].fixed = true;
    }

    // 5. Required Nodes (Lightning Bolts) - INCREASED DIFFICULTY to 5
    const requiredCandidates = fullPath.filter(p => {
        const t = grid[p.r][p.c];
        // Candidates must be normal, not key/lock/fixed/bridge
        return t.status === NodeStatus.NORMAL && !t.fixed && t.type !== TileType.BRIDGE;
    });

    // Shuffle candidates
    for (let i = requiredCandidates.length - 1; i > 0; i--) {
        const j = rng.range(0, i);
        [requiredCandidates[i], requiredCandidates[j]] = [requiredCandidates[j], requiredCandidates[i]];
    }

    let requiredPlaced = 0;
    const targetRequired = 5; 
    
    while(requiredPlaced < targetRequired && requiredCandidates.length > 0) {
        const p = requiredCandidates.pop()!;
        grid[p.r][p.c].status = NodeStatus.REQUIRED;
        requiredPlaced++;
    }
}

function createFallbackGrid(rng: SeededRNG): Grid {
    const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null).map(() => ({
        type: TileType.EMPTY, rotation: 0, fixed: false, status: NodeStatus.NORMAL, hasFlow: false, flowColor: 0, flowDelay: 0
    })));
    
    // Hardcoded playable Y-Shape level
    // Row 1: Source(1,0) -> Straight(1,1) -> Elbow(1,2)(Down-Left, Rot 2)
    grid[1][0] = { ...grid[1][0], type: TileType.SOURCE, fixed: true };
    grid[1][1] = { ...grid[1][1], type: TileType.STRAIGHT, rotation: 1 };
    grid[1][2] = { ...grid[1][2], type: TileType.ELBOW, rotation: 2 }; // Connects Left & Down

    // Row 2: Straight(2,2)(Up-Down)
    grid[2][2] = { ...grid[2][2], type: TileType.STRAIGHT, rotation: 0 };

    // Row 5: Source(5,0) -> Straight(5,1) -> Elbow(5,2)(Up-Left, Rot 3)
    grid[5][0] = { ...grid[5][0], type: TileType.SOURCE, fixed: true };
    grid[5][1] = { ...grid[5][1], type: TileType.STRAIGHT, rotation: 1 };
    grid[5][2] = { ...grid[5][2], type: TileType.ELBOW, rotation: 3 }; // Connects Left & Up

    // Row 4: Straight(4,2)(Down-Up)
    grid[4][2] = { ...grid[4][2], type: TileType.STRAIGHT, rotation: 0 };

    // Row 3: TEE(3,2)(Up-Down-Right) Merge Point
    // Rot 0 TEE = Up, Right, Down.
    grid[3][2] = { ...grid[3][2], type: TileType.TEE, rotation: 0 };

    // Path to Sink: (3,3) -> (3,7)
    for(let c=3; c<7; c++) {
        grid[3][c] = { ...grid[3][c], type: TileType.STRAIGHT, rotation: 1 };
    }
    grid[3][7] = { ...grid[3][7], type: TileType.SINK, fixed: true };

    // Add 1 Required Node to fallback to be safe
    grid[3][4].status = NodeStatus.REQUIRED;
    
    // Fill rest with random pipes using the PASSED RNG
    // This ensures that even fallback levels vary visually between seeds
    fillEmptyTiles(rng, grid);
    
    return grid;
}

function fillEmptyTiles(rng: SeededRNG, grid: Grid) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c].type === TileType.EMPTY) {
                const roll = rng.next();
                
                // 20% Chance for a BLOCK (Wall) - Increases Difficulty
                if (roll < 0.2) {
                     grid[r][c] = {
                        type: TileType.BLOCK,
                        rotation: 0,
                        fixed: true,
                        status: NodeStatus.NORMAL,
                        hasFlow: false, flowColor: 0, flowDelay: 0
                    };
                } else {
                    grid[r][c] = {
                        type: roll > 0.6 ? TileType.STRAIGHT : TileType.ELBOW,
                        rotation: rng.range(0, 3),
                        fixed: false,
                        status: NodeStatus.NORMAL,
                        hasFlow: false, flowColor: 0, flowDelay: 0
                    };
                }
            }
        }
    }
}

function scrambleGrid(rng: SeededRNG, grid: Grid) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!grid[r][c].fixed) {
                // Cannot rotate blocks
                if (grid[r][c].type !== TileType.BLOCK) {
                    grid[r][c].rotation = rng.range(0, 3);
                }
            }
        }
    }
}
