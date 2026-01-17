
import { CampaignChapter, CampaignProgress } from "../types";

const STORAGE_KEY_CAMPAIGN = 'flowstate_campaign_v1';

// --- Campaign Data Definition ---

export const CAMPAIGN_CHAPTERS: CampaignChapter[] = [
    {
        id: "ch1",
        title: "INITIATION",
        description: "Learn the basics of flow control. Simple systems.",
        requiredStars: 0,
        levels: [
            { id: "c1_l1", seed: "INIT_001", parMoves: 10, title: "Hello World" },
            { id: "c1_l2", seed: "INIT_002", parMoves: 12, title: "First Uplink" },
            { id: "c1_l3", seed: "INIT_003", parMoves: 15, title: "Data Stream" },
            { id: "c1_l4", seed: "INIT_004", parMoves: 15, title: "Routing 101" },
            { id: "c1_l5", seed: "INIT_005", parMoves: 18, title: "Gateway" },
            { id: "c1_l6", seed: "INIT_006", parMoves: 20, title: "Firewall Alpha" },
            { id: "c1_l7", seed: "INIT_007", parMoves: 20, title: "Proxy Chain" },
            { id: "c1_l8", seed: "INIT_008", parMoves: 22, title: "Root Access" },
        ]
    },
    {
        id: "ch2",
        title: "THE SPRAWL",
        description: "Navigate the complex city grid. Bugs and interference detected.",
        requiredStars: 15,
        levels: [
            { id: "c2_l1", seed: "SPRAWL_001", parMoves: 20, title: "Neon Alley" },
            { id: "c2_l2", seed: "SPRAWL_002", parMoves: 22, title: "Subway Grid" },
            { id: "c2_l3", seed: "SPRAWL_003", parMoves: 25, title: "Traffic Control" },
            { id: "c2_l4", seed: "SPRAWL_004", parMoves: 25, title: "Power Surge" },
            { id: "c2_l5", seed: "SPRAWL_005", parMoves: 28, title: "Blockade" },
            { id: "c2_l6", seed: "SPRAWL_006", parMoves: 28, title: "Interference" },
            { id: "c2_l7", seed: "SPRAWL_007", parMoves: 30, title: "Gridlock" },
            { id: "c2_l8", seed: "SPRAWL_008", parMoves: 32, title: "Overload" },
        ]
    },
    {
        id: "ch3",
        title: "DEEP NET",
        description: "Advanced security protocols. Requires precise timing.",
        requiredStars: 30,
        levels: [
            { id: "c3_l1", seed: "DEEP_001", parMoves: 25, title: "Dark Fiber" },
            { id: "c3_l2", seed: "DEEP_002", parMoves: 28, title: "Encryption Layer" },
            { id: "c3_l3", seed: "DEEP_003", parMoves: 30, title: "Packet Loss" },
            { id: "c3_l4", seed: "DEEP_004", parMoves: 32, title: "Trojan Path" },
            { id: "c3_l5", seed: "DEEP_005", parMoves: 35, title: "Logic Bomb" },
            { id: "c3_l6", seed: "DEEP_006", parMoves: 35, title: "Zero Day" },
            { id: "c3_l7", seed: "DEEP_007", parMoves: 38, title: "Backdoor" },
            { id: "c3_l8", seed: "DEEP_008", parMoves: 40, title: "Admin Shell" },
        ]
    },
    {
        id: "ch4",
        title: "CORE SYSTEMS",
        description: "High voltage capacitor logic required. Lethal security.",
        requiredStars: 50,
        levels: [
            { id: "c4_l1", seed: "CORE_001", parMoves: 30, title: "Kernel Panic" },
            { id: "c4_l2", seed: "CORE_002", parMoves: 32, title: "Memory Leak" },
            { id: "c4_l3", seed: "CORE_003", parMoves: 35, title: "Stack Overflow" },
            { id: "c4_l4", seed: "CORE_004", parMoves: 38, title: "Deadlock" },
            { id: "c4_l5", seed: "CORE_005", parMoves: 40, title: "Race Condition" },
            { id: "c4_l6", seed: "CORE_006", parMoves: 42, title: "System Halt" },
            { id: "c4_l7", seed: "CORE_007", parMoves: 45, title: "Critical Error" },
            { id: "c4_l8", seed: "CORE_008", parMoves: 50, title: "Blue Screen" },
        ]
    },
    {
        id: "ch5",
        title: "THE SINGULARITY",
        description: "Pure chaos. Only for the architects.",
        requiredStars: 75,
        levels: [
            { id: "c5_l1", seed: "OMEGA_001", parMoves: 40, title: "Event Horizon" },
            { id: "c5_l2", seed: "OMEGA_002", parMoves: 45, title: "Entropy" },
            { id: "c5_l3", seed: "OMEGA_003", parMoves: 50, title: "Big Bang" },
            { id: "c5_l4", seed: "OMEGA_004", parMoves: 55, title: "Heat Death" },
            { id: "c5_l5", seed: "OMEGA_005", parMoves: 60, title: "Simulation End" },
        ]
    }
];

// --- Progress Logic ---

const DEFAULT_PROGRESS: CampaignProgress = {
    unlockedChapters: ['ch1'],
    levelStars: {}
};

export const getCampaignProgress = (): CampaignProgress => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_CAMPAIGN);
        if (saved) return { ...DEFAULT_PROGRESS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PROGRESS;
};

export const saveCampaignProgress = (progress: CampaignProgress) => {
    localStorage.setItem(STORAGE_KEY_CAMPAIGN, JSON.stringify(progress));
};

export const calculateTotalStars = (progress: CampaignProgress): number => {
    return Object.values(progress.levelStars).reduce((a, b) => a + b, 0);
};

export const calculateStarsForRun = (moves: number, par: number): number => {
    if (moves <= par) return 3;
    if (moves <= par + 5) return 2;
    return 1;
};

export const completeLevel = (levelId: string, stars: number): { newProgress: CampaignProgress, justUnlockedChapter: string | null } => {
    const progress = getCampaignProgress();
    
    // Only update if better
    const currentStars = progress.levelStars[levelId] || 0;
    if (stars > currentStars) {
        progress.levelStars[levelId] = stars;
    }

    const totalStars = calculateTotalStars(progress);
    let justUnlockedChapter = null;

    // Check Chapter Unlocks
    CAMPAIGN_CHAPTERS.forEach(ch => {
        if (!progress.unlockedChapters.includes(ch.id) && totalStars >= ch.requiredStars) {
            progress.unlockedChapters.push(ch.id);
            justUnlockedChapter = ch.title;
        }
    });

    saveCampaignProgress(progress);
    return { newProgress: progress, justUnlockedChapter };
};

export const getNextLevelId = (currentLevelId: string): string | null => {
    let found = false;
    for (const ch of CAMPAIGN_CHAPTERS) {
        for (const lvl of ch.levels) {
            if (found) return lvl.id;
            if (lvl.id === currentLevelId) found = true;
        }
    }
    return null; // End of campaign
};
