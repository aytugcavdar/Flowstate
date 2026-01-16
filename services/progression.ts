
import { PlayerProfile, Badge, DailyMission, Grid, NodeStatus } from '../types';
import { STORAGE_KEY_PROFILE } from '../constants';
import { SeededRNG } from '../utils/rng';

export const BADGES: Record<string, Badge> = {
    'NOVICE': { id: 'NOVICE', icon: '🌱' },
    'SPEED_DEMON': { id: 'SPEED_DEMON', icon: '⚡' },
    'NETRUNNER': { id: 'NETRUNNER', icon: '🕵️' },
    'ARCHITECT': { id: 'ARCHITECT', icon: '🏗️' },
    'CYBER_GOD': { id: 'CYBER_GOD', icon: '🦾' }
};

const DEFAULT_PROFILE: PlayerProfile = {
    totalWins: 0,
    fastestWinMs: Infinity,
    consecutiveNoHintWins: 0,
    badges: [],
    xp: 0,
    level: 1
};

// Leveling Constants
const XP_PER_LEVEL = 1000;

export const getTitleForLevel = (level: number): string => {
    if (level >= 50) return "THE SINGULARITY";
    if (level >= 40) return "CYBER GOD";
    if (level >= 30) return "NETRUNNER PRIME";
    if (level >= 20) return "ELITE HACKER";
    if (level >= 15) return "SYSADMIN";
    if (level >= 10) return "WHITE HAT";
    if (level >= 5) return "GREY HAT";
    if (level >= 2) return "SCRIPT KIDDIE";
    return "NOOB";
};

export const getProfile = (): PlayerProfile => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { 
                ...DEFAULT_PROFILE, 
                ...parsed,
                xp: parsed.xp || 0,
                level: parsed.level || 1
            };
        }
        return DEFAULT_PROFILE;
    } catch {
        return DEFAULT_PROFILE;
    }
};

export const saveProfile = (profile: PlayerProfile) => {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
};

// --- Mission Logic ---

export const generateDailyMissions = (dateSeed: string): DailyMission[] => {
    const rng = new SeededRNG(dateSeed + "_MISSIONS");
    const missions: DailyMission[] = [];

    // 1. Speed Mission
    const speedTarget = rng.range(30, 60); // 30s to 60s
    missions.push({
        id: `mission_speed_${dateSeed}`,
        type: 'SPEED',
        target: speedTarget,
        xpReward: 150,
        description: 'mission_speed'
    });

    // 2. Efficiency Mission
    const movesTarget = rng.range(25, 40);
    missions.push({
        id: `mission_moves_${dateSeed}`,
        type: 'MOVES',
        target: movesTarget,
        xpReward: 150,
        description: 'mission_moves'
    });

    // 3. Conditional Mission (No Hint or All Bonus)
    if (rng.next() > 0.5) {
        missions.push({
            id: `mission_nohint_${dateSeed}`,
            type: 'NO_HINT',
            target: 0,
            xpReward: 300,
            description: 'mission_nohint'
        });
    } else {
        missions.push({
            id: `mission_bonus_${dateSeed}`,
            type: 'BONUS_NODES',
            target: 0, // All
            xpReward: 200,
            description: 'mission_bonus'
        });
    }

    return missions;
};

export const checkBadgesOnWin = (
    currentProfile: PlayerProfile, 
    gameDurationMs: number, 
    usedHint: boolean,
    totalMoves: number,
    mode: 'DAILY' | 'PRACTICE',
    grid: Grid,
    streak: number,
    dailyMissions: DailyMission[],
    completedMissionIds: string[]
): { newProfile: PlayerProfile, newBadges: string[], xpGained: number, newCompletedMissions: string[] } => {
    
    const p = { ...currentProfile };
    const newBadges: string[] = [];
    const newCompletedMissions: string[] = [];

    // --- XP Calculation ---
    let baseXP = (mode === 'DAILY' ? 500 : 100);
    
    // Streak Bonus (Only for Daily)
    if (mode === 'DAILY' && streak > 1) {
        // e.g., 5 day streak = 50% bonus
        const multiplier = 1 + (Math.min(streak, 10) * 0.1); 
        baseXP = Math.floor(baseXP * multiplier);
    }
    
    let xpGained = baseXP;

    // Mission Checks (Only for Daily)
    if (mode === 'DAILY') {
        dailyMissions.forEach(mission => {
            // Skip if already done today
            if (completedMissionIds.includes(mission.id)) return;

            let passed = false;
            switch(mission.type) {
                case 'SPEED':
                    if (gameDurationMs / 1000 <= mission.target) passed = true;
                    break;
                case 'MOVES':
                    if (totalMoves <= mission.target) passed = true;
                    break;
                case 'NO_HINT':
                    if (!usedHint) passed = true;
                    break;
                case 'BONUS_NODES':
                    const allReqHit = !grid.flat().some(t => t.status === NodeStatus.REQUIRED && !t.hasFlow);
                    if (allReqHit) passed = true;
                    break;
            }

            if (passed) {
                xpGained += mission.xpReward;
                newCompletedMissions.push(mission.id);
            }
        });
    }

    // Apply XP & Level Up
    p.xp += xpGained;
    p.level = Math.floor(p.xp / XP_PER_LEVEL) + 1;

    // --- Stats Update ---
    p.totalWins += 1;
    if (gameDurationMs < p.fastestWinMs) p.fastestWinMs = gameDurationMs;
    
    if (usedHint) {
        p.consecutiveNoHintWins = 0;
    } else {
        p.consecutiveNoHintWins += 1;
    }

    // --- Badge Logic ---
    if (!p.badges.includes('NOVICE')) { p.badges.push('NOVICE'); newBadges.push('NOVICE'); }
    if (gameDurationMs < 30000 && !p.badges.includes('SPEED_DEMON')) { p.badges.push('SPEED_DEMON'); newBadges.push('SPEED_DEMON'); }
    if (p.consecutiveNoHintWins >= 5 && !p.badges.includes('NETRUNNER')) { p.badges.push('NETRUNNER'); newBadges.push('NETRUNNER'); }
    if (p.totalWins >= 10 && !p.badges.includes('ARCHITECT')) { p.badges.push('ARCHITECT'); newBadges.push('ARCHITECT'); }
    if (totalMoves < 20 && gameDurationMs < 45000 && !p.badges.includes('CYBER_GOD')) { p.badges.push('CYBER_GOD'); newBadges.push('CYBER_GOD'); }

    saveProfile(p);
    return { newProfile: p, newBadges, xpGained, newCompletedMissions };
};
