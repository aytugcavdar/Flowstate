import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { generateDailyLevel, calculateFlow, checkWinCondition } from './services/gameLogic';
import { getDailyTheme, getWinningCommentary } from './services/geminiService';
import { playSound } from './services/audio';
import { Tile } from './components/Tile';
import { Modal } from './components/Modal';
import { 
  GameState, 
  DailyStats, 
  DailyTheme, 
  TileType, 
  NodeStatus, 
  WinAnalysis
} from './types';
import { STORAGE_KEY_STATS, STORAGE_KEY_STATE, GRID_SIZE } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [grid, setGrid] = useState<GameState['grid']>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState(Date.now().toString()); // Dynamic seed for testing
  
  // Theme & AI
  const [theme, setTheme] = useState<DailyTheme | null>(null);
  const [winData, setWinData] = useState<WinAnalysis | null>(null);
  
  // Modals
  const [showIntro, setShowIntro] = useState(false);
  const [showWin, setShowWin] = useState(false);
  
  // Stats
  const [stats, setStats] = useState<DailyStats>({ streak: 0, lastPlayed: '', history: {} });

  // In production, this would be new Date().toDateString()
  // For testing, we use the state 'seed' to allow resetting.
  const currentKey = useMemo(() => `DEV_${seed}`, [seed]);

  // --- Initialization ---
  useEffect(() => {
    const initGame = async () => {
      setLoading(true);
      // 1. Load Stats
      const savedStats = localStorage.getItem(STORAGE_KEY_STATS);
      if (savedStats) setStats(JSON.parse(savedStats));

      // 2. Load Theme (Async, non-blocking for grid)
      // We pass the current Key to get a unique theme or cached theme
      getDailyTheme(currentKey).then(setTheme);

      // 3. Load or Create Game State
      const savedStateStr = localStorage.getItem(STORAGE_KEY_STATE);
      let loadedState: GameState | null = savedStateStr ? JSON.parse(savedStateStr) : null;

      if (loadedState && loadedState.gameDate === currentKey) {
        // Resume specific game
        setGrid(loadedState.grid);
        setMoves(loadedState.moves);
        setIsWon(loadedState.isWon);
        if (loadedState.isWon) setShowWin(true);
      } else {
        // New game
        const newGrid = generateDailyLevel(currentKey);
        setGrid(newGrid);
        setMoves(0);
        setIsWon(false);
        setWinData(null); // Reset win data
        setShowIntro(true);
      }
      setLoading(false);
    };

    initGame();
  }, [currentKey]);

  // --- Persistence ---
  useEffect(() => {
    if (!loading && grid.length > 0) {
      const state: GameState = { grid, moves, isWon, gameDate: currentKey };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
    }
  }, [grid, moves, isWon, loading, currentKey]);

  // --- Controls ---
  const handleReset = () => {
      setSeed(Date.now().toString());
      setShowWin(false);
      setShowIntro(false);
      setIsWon(false);
  };

  // --- Interactions ---
  const handleTileClick = useCallback((r: number, c: number) => {
    if (isWon || grid[r][c].fixed) return;

    playSound('rotate');

    setGrid(prev => {
      const newGrid = prev.map(row => row.map(t => ({ ...t })));
      // Rotate 90 degrees clockwise
      newGrid[r][c].rotation = (newGrid[r][c].rotation + 1) % 4;
      
      // Recalculate Flow
      const flowedGrid = calculateFlow(newGrid);
      
      // Check for glitch activation (Newly powered Forbidden node)
      const hasNewGlitch = flowedGrid.flat().some((t, i) => 
         t.status === NodeStatus.FORBIDDEN && t.hasFlow && !prev.flat()[i].hasFlow
      );
      
      if (hasNewGlitch) {
          playSound('glitch');
          if (navigator.vibrate) navigator.vibrate(50);
      }

      // Check for new power connection
      const prevPower = prev.flat().filter(t => t.hasFlow).length;
      const newPower = flowedGrid.flat().filter(t => t.hasFlow).length;
      if (newPower > prevPower && !hasNewGlitch) {
          playSound('power');
      }

      // Check Win
      const won = checkWinCondition(flowedGrid);
      if (won && !isWon) {
        setIsWon(true);
        handleWin(moves + 1, flowedGrid);
      }

      return flowedGrid;
    });
    setMoves(m => m + 1);
  }, [grid, isWon, moves]);

  const handleWin = async (finalMoves: number, finalGrid: GameState['grid']) => {
    playSound('win');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

    // 1. Trigger Confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22d3ee', '#34d399', '#facc15', '#ffffff'] 
    });

    // Update stats (Mock stats for testing mode)
    const newStats = { ...stats };
    // Always increment streak for fun in testing
    newStats.streak += 1;
    setStats(newStats);
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));

    // Get AI commentary
    const data = await getWinningCommentary(finalMoves, finalGrid);
    setWinData(data);
    
    setTimeout(() => {
        setShowWin(true);
    }, 1200);
  };

  const generateShareText = () => {
    let gridEmoji = '';
    for(let r=0; r<GRID_SIZE; r++) {
        for(let c=0; c<GRID_SIZE; c++) {
            const t = grid[r][c];
            if (t.type === TileType.SOURCE || t.type === TileType.SINK) gridEmoji += '⚡';
            else if (t.status === NodeStatus.FORBIDDEN) gridEmoji += t.hasFlow ? '🟥' : '⬛';
            else if (t.status === NodeStatus.REQUIRED) gridEmoji += t.hasFlow ? '🟩' : '⬜';
            else if (t.hasFlow) gridEmoji += '🟨';
            else gridEmoji += '⬛';
        }
        gridEmoji += '\n';
    }
    
    const rankText = winData?.rank ? ` | ${winData.rank}` : '';
    return `FlowState DEV\n${moves} Moves${rankText}\n\n${gridEmoji}`;
  };

  const copyShare = () => {
    navigator.clipboard.writeText(generateShareText());
    alert('Result copied to clipboard!');
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-mono animate-pulse">Initializing Test Environment...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center">
      
      {/* Header */}
      <header className="w-full max-w-lg p-4 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
        <div>
           <div className="flex items-center gap-2">
             <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-yellow-400">
               FLOWSTATE
             </h1>
             <span className="text-[10px] bg-red-900 text-red-100 px-1 rounded border border-red-500/30">DEV MODE</span>
           </div>
           {theme && <p className="text-xs text-slate-400 font-mono tracking-widest uppercase truncate max-w-[150px]">{theme.name}</p>}
        </div>
        <div className="flex gap-4 text-sm font-mono items-center">
           <button 
             onClick={handleReset}
             className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs rounded text-slate-300 transition-colors"
           >
             NEW GAME
           </button>
           <div className="text-center hidden sm:block">
             <span className="block text-slate-500 text-xs">MOVES</span>
             <span className="text-white font-bold">{moves}</span>
           </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 w-full max-w-lg p-4 flex flex-col items-center justify-center gap-6">
        
        {/* The Grid */}
        <div 
            className={`grid gap-1 p-2 bg-slate-900 rounded-xl shadow-2xl border transition-all duration-1000 ${isWon ? 'border-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.3)]' : 'border-slate-800'}`}
            style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`
            }}
        >
          {grid.map((row, r) => 
            row.map((tile, c) => (
              <div key={`${r}-${c}`} className="w-12 h-12 sm:w-14 sm:h-14">
                <Tile tile={tile} onClick={() => handleTileClick(r, c)} isWon={isWon} />
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-slate-500 font-mono uppercase tracking-wide">
             <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]"></span> Req</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-900"></span> Bug</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.5)]"></span> Pwr</div>
        </div>

      </main>

      {/* Intro Modal */}
      <Modal isOpen={showIntro} onClose={() => setShowIntro(false)} title="System Ready">
        <div className="space-y-4">
            <p className="text-sm text-slate-400 italic border-l-2 border-blue-500 pl-3">
               "{theme?.description || "Awaiting input..."}"
            </p>
            <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">👉 <strong>Rotate pipes</strong> to connect Source to Sink.</li>
                <li className="flex items-center gap-2">⚡ <strong>Power</strong> all 'Req' nodes.</li>
                <li className="flex items-center gap-2">🚫 <strong>Avoid</strong> 'Bug' nodes.</li>
                <li className="flex items-center gap-2">⚠️ <strong>Diodes (▶)</strong> are one-way only!</li>
            </ul>
            <button 
                onClick={() => { setShowIntro(false); playSound('power'); }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all"
            >
                START SIMULATION
            </button>
        </div>
      </Modal>

      {/* Win Modal */}
      <Modal isOpen={showWin} onClose={() => setShowWin(false)} title="Test Complete">
        <div className="space-y-6 text-center">
            <div className="text-6xl animate-bounce">⚡</div>
            <div>
                <h3 className="text-2xl font-bold text-white">Grid Online</h3>
                <p className="text-slate-400">in {moves} moves</p>
            </div>
            
            {winData ? (
                <div className="space-y-3">
                    <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-widest animate-pulse">
                        {winData.rank}
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg text-sm italic text-yellow-100/80 border border-slate-700">
                        <span className="block text-xs text-slate-500 not-italic mb-1 font-bold">AI LOG:</span>
                        "{winData.comment}"
                    </div>
                </div>
            ) : (
                <div className="text-xs text-slate-500 animate-pulse">Analyzing performance...</div>
            )}

            <div className="flex gap-2">
                <button 
                    onClick={copyShare}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all"
                >
                    SHARE
                </button>
                <button 
                    onClick={handleReset}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all"
                >
                    NEXT LEVEL
                </button>
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;