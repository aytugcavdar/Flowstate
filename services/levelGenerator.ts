
import { Grid, TileType, NodeStatus, GridPos, DIRECTIONS } from '../types';
import { GRID_SIZE } from '../constants';
import { SeededRNG } from '../utils/rng';
import { calculateFlow, checkWinCondition } from './gameLogic';

// --- Geometry Helpers ---

const getDistance = (a: GridPos, b: GridPos) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

function getDir(from: GridPos, to: GridPos): number {
    if (to.r < from.r) return 0; // Up
    if (to.c > from.c) return 1; // Right
    if (to.r > from.r) return 2; // Down
    if (to.c < from.c) return 3; // Left
    return 1;
}

function getElbowRotation(entrySide: number, exitSide: number): number {
    const connections = [entrySide, exitSide].sort((a,b) => a-b);
    if (connections[0] === 0 && connections[1] === 1) return 0;
    if (connections[0] === 1 && connections[1] === 2) return 1;
    if (connections[0] === 2 && connections[1] === 3) return 2;
    if (connections[0] === 0 && connections[1] === 3) return 3;
    return 0;
}

function getTeeRotation(sides: number[]): number {
    const all = new Set([0, 1, 2, 3]);
    sides.forEach(s => all.delete(s));
    const closedSide = Array.from(all)[0]; 
    switch(closedSide) {
        case 3: return 0;
        case 0: return 1;
        case 1: return 2;
        case 2: return 3;
        default: return 0;
    }
}

// --- Pathfinding ---

function findPath(
    rng: SeededRNG, 
    start: GridPos, 
    end: GridPos, 
    grid: Grid, 
    forbidden: Set<string>
): GridPos[] | null {
    
    const queue: { pos: GridPos, path: GridPos[] }[] = [{ pos: start, path: [start] }];
    const visited = new Set<string>([...forbidden, `${start.r},${start.c}`]);
    let bestPath: GridPos[] | null = null;

    let iterations = 0;
    while (queue.length > 0 && iterations < 600) {
        iterations++;
        queue.sort((a, b) => {
            const distA = getDistance(a.pos, end);
            const distB = getDistance(b.pos, end);
            return (distA - distB) + (rng.next() * 2 - 1);
        });

        const { pos, path } = queue.shift()!;

        if (pos.r === end.r && pos.c === end.c) {
            return path;
        }

        const dirs = [0, 1, 2, 3].sort(() => rng.next() - 0.5);

        for (const d of dirs) {
            const nr = pos.r + DIRECTIONS[d][0];
            const nc = pos.c + DIRECTIONS[d][1];
            const key = `${nr},${nc}`;

            if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
            if (visited.has(key)) continue;
            if (grid[nr][nc].type !== TileType.EMPTY && (nr !== end.r || nc !== end.c)) continue;
            // More lenient heuristic to allow winding paths
            if (getDistance({r:nr, c:nc}, end) > getDistance(pos, end) + 6) continue;

            visited.add(key);
            queue.push({ pos: { r: nr, c: nc }, path: [...path, { r: nr, c: nc }] });
        }
    }
    return bestPath;
}

// --- Main Generator ---

export const generateDailyLevel = (dateStr: string): Grid => {
    const rng = new SeededRNG(dateStr);
    
    for (let attempt = 0; attempt < 30; attempt++) {
        const grid: Grid = Array(GRID_SIZE).fill(null).map(() => 
            Array(GRID_SIZE).fill(null).map(() => ({
                type: TileType.EMPTY, rotation: 0, fixed: false, status: NodeStatus.NORMAL, hasFlow: false, flowColor: 0, flowDelay: 0
            }))
        );

        const occupied = new Set<string>();
        const markOccupied = (p: GridPos) => occupied.add(`${p.r},${p.c}`);

        // 1. ANCHORS
        const srcA: GridPos = { r: rng.range(0, 2), c: rng.range(0, 1) };
        const srcB: GridPos = { r: rng.range(5, 7), c: rng.range(0, 1) };
        const sink: GridPos = { r: rng.range(2, 5), c: GRID_SIZE - 1 };
        const merge: GridPos = { r: rng.range(2, 5), c: rng.range(3, 5) };

        grid[srcA.r][srcA.c] = { ...grid[srcA.r][srcA.c], type: TileType.SOURCE, fixed: true };
        grid[srcB.r][srcB.c] = { ...grid[srcB.r][srcB.c], type: TileType.SOURCE, fixed: true };
        grid[sink.r][sink.c] = { ...grid[sink.r][sink.c], type: TileType.SINK, fixed: true };
        
        markOccupied(srcA); markOccupied(srcB); markOccupied(sink); markOccupied(merge);

        // 2. SKELETON
        const pathA = findPath(rng, srcA, merge, grid, occupied);
        if (!pathA) continue;
        pathA.slice(1, -1).forEach(markOccupied);

        const pathB = findPath(rng, srcB, merge, grid, occupied);
        if (!pathB) continue;
        pathB.slice(1, -1).forEach(markOccupied);

        const pathC = findPath(rng, merge, sink, grid, occupied);
        if (!pathC) continue;
        pathC.slice(1, -1).forEach(markOccupied);

        // 3. RENDER PATHS
        renderSegment(grid, pathA, rng);
        renderSegment(grid, pathB, rng);
        renderSegment(grid, pathC, rng);

        // 4. MERGE POINT
        const prevA = pathA[pathA.length - 2];
        const prevB = pathB[pathB.length - 2];
        const nextC = pathC[1];
        const dirFromA = getDir(prevA, merge);
        const dirFromB = getDir(prevB, merge);
        const dirToC   = getDir(merge, nextC);
        
        const connections = [(dirFromA + 2) % 4, (dirFromB + 2) % 4, dirToC];
        const uniqueConns = Array.from(new Set(connections));
        
        if (uniqueConns.length === 3) {
            grid[merge.r][merge.c].type = TileType.TEE;
            grid[merge.r][merge.c].rotation = getTeeRotation(uniqueConns);
            grid[merge.r][merge.c].fixed = true;
        } else {
            grid[merge.r][merge.c].type = TileType.CROSS;
            grid[merge.r][merge.c].fixed = true;
        }

        // 5. MECHANICS
        const fullSkeleton = [...pathA, ...pathB, ...pathC];

        // A. CAPACITOR & HAZARD COMBO (Smart Bug)
        // Try to place a Capacitor early, and if successful, place a BUG later on the SAME path.
        // This forces the user to pick up the capacitor to clear the path.
        if (rng.next() > 0.3) { // 70% chance
            const route = rng.next() > 0.5 ? pathA : pathB;
            if (route.length > 4) {
                const capIndex = 1; // Early
                const bugIndex = route.length - 2; // Late (before merge)
                
                const capPos = route[capIndex];
                const bugPos = route[bugIndex];

                if (!grid[capPos.r][capPos.c].fixed && !grid[bugPos.r][bugPos.c].fixed) {
                    grid[capPos.r][capPos.c].status = NodeStatus.CAPACITOR;
                    // We turn the path tile into a STRAIGHT or ELBOW that is FORBIDDEN
                    // Note: It's already rendered as a pipe. We just add status.
                    grid[bugPos.r][bugPos.c].status = NodeStatus.FORBIDDEN;
                }
            }
        }

        // B. REQUIRED NODES (Side Quests / U-Turns)
        // Try multiple times to ensure at least some stick
        let bonusAdded = 0;
        for (let i=0; i<6; i++) {
             if (addSideQuest(rng, grid, fullSkeleton)) bonusAdded++;
             if (bonusAdded >= 3) break;
        }

        // C. DECOYS (Branches with Bugs)
        // These are distinct from the "Path Bug" above. These are misleading branches.
        addDecoy(rng, grid, fullSkeleton, occupied);
        addDecoy(rng, grid, fullSkeleton, occupied);

        // D. KEY/LOCK
        if (pathC.length > 3 && rng.next() > 0.6) {
            const lockIdx = pathC.length - 2;
            const lockPos = pathC[lockIdx];
            grid[lockPos.r][lockPos.c].status = NodeStatus.LOCKED;
            grid[lockPos.r][lockPos.c].fixed = true;

            const keyPath = rng.next() > 0.5 ? pathA : pathB;
            if (keyPath.length > 2) {
                const keyPos = keyPath[Math.floor(rng.next() * (keyPath.length - 2)) + 1];
                if (grid[keyPos.r][keyPos.c].status === NodeStatus.NORMAL) {
                    grid[keyPos.r][keyPos.c].status = NodeStatus.KEY;
                }
            }
        }

        // 6. VALIDATE
        const validationFlow = calculateFlow(grid);
        grid[sink.r][sink.c].type = TileType.SINK; 
        if (validationFlow[sink.r][sink.c].flowColor === 3) {
            fillEmptyTiles(rng, grid);
            scrambleGrid(rng, grid);
            return calculateFlow(grid);
        }
    }
    
    return createSimpleFallback(rng);
};

// --- Rendering Helpers ---

function renderSegment(grid: Grid, path: GridPos[], rng: SeededRNG) {
    for (let i = 1; i < path.length - 1; i++) {
        const prev = path[i-1];
        const curr = path[i];
        const next = path[i+1];

        if (grid[curr.r][curr.c].type !== TileType.EMPTY) continue;

        const dirIn = getDir(prev, curr);
        const dirOut = getDir(curr, next);

        if (dirIn === dirOut) {
            const isVert = dirIn === 0 || dirIn === 2;
            // Increased Diode chance to 35%
            if (rng.next() > 0.65) {
                grid[curr.r][curr.c] = { ...grid[curr.r][curr.c], type: TileType.DIODE, rotation: dirOut };
            } else {
                grid[curr.r][curr.c] = { ...grid[curr.r][curr.c], type: TileType.STRAIGHT, rotation: isVert ? 0 : 1 };
            }
        } else {
            const entrySide = (dirIn + 2) % 4;
            const rot = getElbowRotation(entrySide, dirOut);
            grid[curr.r][curr.c] = { ...grid[curr.r][curr.c], type: TileType.ELBOW, rotation: rot };
        }
    }
}

function addSideQuest(rng: SeededRNG, grid: Grid, path: GridPos[]): boolean {
    // Try to find a spot to branch out 1-2 steps
    const candidates = path.filter(p => 
        (grid[p.r][p.c].type === TileType.STRAIGHT || grid[p.r][p.c].type === TileType.ELBOW) && 
        !grid[p.r][p.c].fixed && 
        grid[p.r][p.c].status === NodeStatus.NORMAL
    );
    
    if (candidates.length === 0) return false;
    
    // Shuffle candidates to try random spots
    const startIdx = rng.range(0, candidates.length - 1);
    const target = candidates[startIdx];
    
    // Try all 4 directions for a branch
    const dirs = [0, 1, 2, 3].sort(() => rng.next() - 0.5);
    
    for (const d of dirs) {
        const r1 = target.r + DIRECTIONS[d][0];
        const c1 = target.c + DIRECTIONS[d][1];
        
        // Step 1: Check if immediate neighbor is empty
        if (r1 >= 0 && r1 < GRID_SIZE && c1 >= 0 && c1 < GRID_SIZE && grid[r1][c1].type === TileType.EMPTY) {
            
            // Chance for a 2-step branch (U-turnish)
            let placed = false;
            if (rng.next() > 0.4) {
                 // Try 2nd step
                 // Try turning 90 degrees
                 const turnDirs = [(d+1)%4, (d+3)%4];
                 for (const td of turnDirs) {
                     const r2 = r1 + DIRECTIONS[td][0];
                     const c2 = c1 + DIRECTIONS[td][1];
                     
                     if (r2 >= 0 && r2 < GRID_SIZE && c2 >= 0 && c2 < GRID_SIZE && grid[r2][c2].type === TileType.EMPTY) {
                         // Create 2-step branch
                         // Target becomes TEE
                         grid[target.r][target.c].type = TileType.TEE;
                         // Pos1 becomes ELBOW/STRAIGHT
                         grid[r1][c1] = {
                             type: TileType.STRAIGHT, // Simplification
                             rotation: d % 2,
                             fixed: false, status: NodeStatus.NORMAL, hasFlow: false, flowColor: 0, flowDelay: 0
                         };
                         // Pos2 becomes REQUIRED (End of line)
                         grid[r2][c2] = {
                             type: TileType.ELBOW,
                             rotation: rng.range(0, 3),
                             fixed: false, status: NodeStatus.REQUIRED, hasFlow: false, flowColor: 0, flowDelay: 0
                         };
                         placed = true;
                         break;
                     }
                 }
            }
            
            if (!placed) {
                // Fallback to 1-step branch
                grid[target.r][target.c].type = TileType.TEE;
                grid[r1][c1] = {
                    type: TileType.ELBOW,
                    rotation: rng.range(0, 3),
                    fixed: false,
                    status: NodeStatus.REQUIRED,
                    hasFlow: false, flowColor: 0, flowDelay: 0
                };
                placed = true;
            }
            
            if (placed) return true;
        }
    }
    return false;
}

function addDecoy(rng: SeededRNG, grid: Grid, path: GridPos[], occupied: Set<string>) {
    const start = path[rng.range(1, path.length - 2)];
    if (grid[start.r][start.c].fixed) return;

    let curr = start;
    let len = 0;
    // Decoy length 1-3
    const maxLen = rng.range(1, 3);
    
    while(len < maxLen) {
        const dirs = [0, 1, 2, 3].filter(d => {
             const nr = curr.r + DIRECTIONS[d][0];
             const nc = curr.c + DIRECTIONS[d][1];
             return nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !occupied.has(`${nr},${nc}`) && grid[nr][nc].type === TileType.EMPTY;
        });

        if (dirs.length === 0) break;
        const dir = dirs[rng.range(0, dirs.length - 1)];
        
        const nr = curr.r + DIRECTIONS[dir][0];
        const nc = curr.c + DIRECTIONS[dir][1];
        
        // If we are extending from the path, ensure connection type on start
        if (len === 0) {
            // We don't change the path tile type here blindly to avoid breaking flow,
            // we just place the decoy tiles nearby. The "Scramble" phase might align them 
            // visually to look like a branch, or the user rotates the path to connect.
        }
        
        grid[nr][nc] = {
            type: len === maxLen - 1 ? TileType.ELBOW : TileType.STRAIGHT, 
            rotation: rng.range(0, 3),
            fixed: false,
            status: len === maxLen - 1 ? NodeStatus.FORBIDDEN : NodeStatus.NORMAL,
            hasFlow: false, flowColor: 0, flowDelay: 0
        };
        
        occupied.add(`${nr},${nc}`);
        curr = { r: nr, c: nc };
        len++;
    }
}

function fillEmptyTiles(rng: SeededRNG, grid: Grid) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c].type === TileType.EMPTY) {
                const roll = rng.next();
                let type = TileType.ELBOW;
                if (roll > 0.8) type = TileType.STRAIGHT;
                else if (roll > 0.6) type = TileType.TEE;
                else if (roll > 0.95) type = TileType.DIODE;

                grid[r][c] = {
                    type,
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
                grid[r][c].rotation = rng.range(0, 3);
            }
        }
    }
}

function createSimpleFallback(rng: SeededRNG): Grid {
    const grid: Grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null).map(() => ({
        type: TileType.EMPTY, rotation: 0, fixed: false, status: NodeStatus.NORMAL, hasFlow: false, flowColor: 0, flowDelay: 0
    })));
    
    grid[2][0] = { ...grid[2][0], type: TileType.SOURCE, fixed: true };
    grid[5][0] = { ...grid[5][0], type: TileType.SOURCE, fixed: true };
    grid[3][7] = { ...grid[3][7], type: TileType.SINK, fixed: true };

    fillEmptyTiles(rng, grid);
    return calculateFlow(grid);
}
