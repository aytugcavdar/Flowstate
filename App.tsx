import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { generateDailyLevel, calculateFlow, checkWinCondition } from './services/gameLogic';
import { getDailyTheme, getWinningCommentary, getGameHint } from './services/geminiService';
import { playSound, startAmbience, setMusicIntensity, stopAmbience } from './services/audio';
import { Tile } from './components/Tile';
import { Modal } from './components/Modal';
import { CyberpunkOverlay } from './components/CyberpunkOverlay';
import { TRANSLATIONS, Language } from './constants/translations';
import { 
  GameState, 
  DailyStats, 
  DailyTheme, 
  TileType, 
  NodeStatus, 
  WinAnalysis
} from './types';
import { STORAGE_KEY_STATS, STORAGE_KEY_STATE, GRID_SIZE } from './constants';

type GameMode = 'DAILY' | 'PRACTICE';

const App: React.FC = () => {
  // --- State ---
  const [lang, setLang] = useState<Language>('en');
  const [mode, setMode] = useState<GameMode>('DAILY');
  
  const [grid, setGrid] = useState<GameState['grid']>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New State for Win Animation
  const [showHackEffect, setShowHackEffect] = useState(false);
  
  // Practice mode specific seed
  const [practiceSeed, setPracticeSeed] = useState(Date.now().toString());
  
  // Theme & AI
  const [theme, setTheme] = useState<DailyTheme | null>(null);
  const [winData, setWinData] = useState<WinAnalysis | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  
  // Modals
  const [showIntro, setShowIntro] = useState(false);
  const [showWin, setShowWin] = useState(false);
  
  // Stats
  const [stats, setStats] = useState<DailyStats>({ streak: 0, lastPlayed: '', history: {} });

  // Translations shortcut
  const t = TRANSLATIONS[lang];

  // Calculate Key based on Mode
  const currentKey = useMemo(() => {
    if (mode === 'DAILY') {
      // YYYY-MM-DD format based on local time
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    } else {
      return `PRACTICE_${practiceSeed}`;
    }
  }, [mode, practiceSeed]);

  // Storage Key depends on mode to avoid overwriting Daily with Practice
  const storageKey = useMemo(() => {
     return mode === 'DAILY' ? `${STORAGE_KEY_STATE}_DAILY` : `${STORAGE_KEY_STATE}_PRACTICE`;
  }, [mode]);

  // --- Dynamic Music Logic ---
  useEffect(() => {
    if (loading || grid.length === 0 || isWon) return;

    // Calculate how much of the grid is powered (Intensity)
    // We only count non-empty tiles.
    let poweredTiles = 0;
    let totalTiles = 0;

    grid.forEach(row => row.forEach(tile => {
        if (tile.type !== TileType.EMPTY) {
            totalTiles++;
            if (tile.hasFlow) poweredTiles++;
        }
    }));

    const intensity = totalTiles > 0 ? (poweredTiles / totalTiles) : 0;
    
    // Smooth the transition in the audio service
    setMusicIntensity(intensity);

  }, [grid, isWon, loading]);

  // --- Initialization ---
  useEffect(() => {
    const initGame = async () => {
      setLoading(true);
      setShowWin(false);
      setWinData(null);
      setHint(null);
      setShowHackEffect(false);
      
      // Stop music when resetting/changing modes, it will restart on interaction
      stopAmbience();
      
      // 1. Load Global Stats
      const savedStats = localStorage.getItem(STORAGE_KEY_STATS);
      if (savedStats) setStats(JSON.parse(savedStats));

      // 2. Load Theme (Daily gets specific theme, Practice gets random vibe based on seed)
      // Only fetch theme if it's not already set for this key to save API calls
      // Pass 'lang' to get translated themes
      getDailyTheme(mode === 'DAILY' ? currentKey : 'CYBERPUNK_RANDOM', lang).then(setTheme);

      // 3. Load or Create Game State
      const savedStateStr = localStorage.getItem(storageKey);
      let loadedState: GameState | null = savedStateStr ? JSON.parse(savedStateStr) : null;

      // If loaded state matches current key (e.g. same day or same practice session)
      if (loadedState && loadedState.gameDate === currentKey) {
        setGrid(loadedState.grid);
        setMoves(loadedState.moves);
        setIsWon(loadedState.isWon);
        if (loadedState.isWon) setShowWin(true);
        // Don't show intro if already started
        setShowIntro(false); 
      } else {
        // New game generation
        const newGrid = generateDailyLevel(currentKey);
        setGrid(newGrid);
        setMoves(0);
        setIsWon(false);
        setShowIntro(true); // Show intro for new games
      }
      setLoading(false);
    };

    initGame();
  }, [currentKey, storageKey, mode, lang]);

  // --- Persistence ---
  useEffect(() => {
    if (!loading && grid.length > 0) {
      const state: GameState = { grid, moves, isWon, gameDate: currentKey };
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [grid, moves, isWon, loading, currentKey, storageKey]);

  // --- Controls ---
  const handleStartGame = () => {
      setShowIntro(false);
      // Browser policy: Audio Context must be resumed on user interaction
      startAmbience();
      playSound('power');
  };

  const handleNewPractice = () => {
      setPracticeSeed(Date.now().toString());
      // State reset happens in useEffect when key changes
  };

  const handleModeSwitch = (newMode: GameMode) => {
      setMode(newMode);
  };

  const requestHint = async () => {
      if (loadingHint || isWon) return;
      setLoadingHint(true);
      playSound('click');
      const hintText = await getGameHint(grid, lang);
      setHint(hintText);
      setLoadingHint(false);
      // Clear hint after 8 seconds
      setTimeout(() => setHint(null), 8000);
  };

  const toggleLanguage = () => {
      setLang(prev => prev === 'en' ? 'tr' : 'en');
      playSound('click');
  };

  // --- Interactions ---
  const handleTileClick = useCallback((r: number, c: number) => {
    if (isWon || grid[r][c].fixed) return;
    
    // Ensure music is running if user skipped intro or refreshed
    // The previous implementation only called it on handleStartGame, which might be skipped if state is loaded
    startAmbience();

    playSound('rotate');
    // Clear hint on move interaction
    if (hint) setHint(null);

    // Deep copy grid to modify and calculate flow BEFORE setting state
    // This allows us to calculate animation delays accurately for the win condition
    const newGrid = grid.map(row => row.map(t => ({ ...t })));
    newGrid[r][c].rotation = (newGrid[r][c].rotation + 1) % 4;
    
    // Recalculate Flow
    const flowedGrid = calculateFlow(newGrid);
    
    // Check for glitch activation (Newly powered Forbidden node)
    const hasNewGlitch = flowedGrid.flat().some((t, i) => 
       t.status === NodeStatus.FORBIDDEN && t.hasFlow && !grid.flat()[i].hasFlow
    );
    
    if (hasNewGlitch) {
        playSound('glitch');
        if (navigator.vibrate) navigator.vibrate(50);
    }

    // Check for new power connection
    const prevPower = grid.flat().filter(t => t.hasFlow).length;
    const newPower = flowedGrid.flat().filter(t => t.hasFlow).length;
    if (newPower > prevPower && !hasNewGlitch) {
        playSound('power');
    }

    // Update State
    setGrid(flowedGrid);
    setMoves(m => m + 1);

    // Check Win Condition
    const won = checkWinCondition(flowedGrid);
    if (won) {
      setIsWon(true);
      
      // Dynamic delay: Wait for the flow animation to reach the sink
      let animationDelay = 0;
      const sinkTile = flowedGrid.flat().find(t => t.type === TileType.SINK);
      
      if (sinkTile && sinkTile.hasFlow) {
        // flowDelay is the start time. 
        // We add ~300ms for the CSS transition to complete visually
        // We add ~800ms buffer for the user to enjoy the connected state
        animationDelay = sinkTile.flowDelay + 300 + 800;
      } else {
        animationDelay = 1000;
      }

      setTimeout(() => {
        handleWin(moves + 1, flowedGrid);
      }, animationDelay);
    }
  }, [grid, isWon, moves, hint]);

  const handleWin = async (finalMoves: number, finalGrid: GameState['grid']) => {
    // 1. Trigger the Hack Animation
    setShowHackEffect(true);
    // Play win sound (handles stopping ambience)
    playSound('win');
    
    // Update stats ONLY for Daily mode
    if (mode === 'DAILY') {
        const newStats = { ...stats };
        if (newStats.lastPlayed !== currentKey) {
            newStats.streak += 1;
            newStats.lastPlayed = currentKey;
            // Simple history tracking
            newStats.history[currentKey] = finalMoves;
            setStats(newStats);
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));
        }
    }

    // Get AI commentary in background while animation plays
    const data = await getWinningCommentary(finalMoves, finalGrid, lang);
    setWinData(data);
  };

  // Called when CyberpunkOverlay finishes its sequence
  const onHackAnimComplete = () => {
    setShowHackEffect(false);
    
    // 2. Show the actual results modal
    setShowWin(true);
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
    
    const modeText = mode === 'DAILY' ? `${t.shareTemplate.daily} ${currentKey}` : t.shareTemplate.practice;
    const rankText = winData?.rank ? ` | ${winData.rank}` : '';
    return `${t.title} ${modeText}\n${moves} ${t.shareTemplate.moves}${rankText}\n\n${gridEmoji}`;
  };

  const copyShare = () => {
    navigator.clipboard.writeText(generateShareText());
    alert(t.win.shareText);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-mono animate-pulse">{t.status.initializing}</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center">
      
      {/* Cyberpunk Win Overlay - Only shows when won, before modal */}
      {showHackEffect && <CyberpunkOverlay onComplete={onHackAnimComplete} lang={lang} />}

      {/* Header */}
      <header className="w-full max-w-lg p-4 pb-2 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex justify-between items-start mb-4">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-yellow-400">
                    {t.title}
                    </h1>
                    <button 
                        onClick={toggleLanguage}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono"
                    >
                        {lang === 'en' ? 'TR' : 'EN'}
                    </button>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-1">
                    {mode === 'DAILY' && stats.streak > 0 && (
                        <span className="text-yellow-500">🔥 {stats.streak} {t.streak}</span>
                    )}
                </div>
            </div>
            
            <div className="text-right">
                <span className="block text-slate-500 text-[10px] uppercase tracking-wider">{t.moves}</span>
                <span className="text-white font-bold font-mono text-xl">{moves}</span>
            </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex p-1 bg-slate-800/50 rounded-lg backdrop-blur-sm">
            <button 
                onClick={() => { handleModeSwitch('DAILY'); stopAmbience(); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'DAILY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                {t.modes.daily}
            </button>
            <button 
                onClick={() => { handleModeSwitch('PRACTICE'); stopAmbience(); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'PRACTICE' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                {t.modes.practice}
            </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 w-full max-w-lg p-4 flex flex-col items-center justify-center gap-6">
        
        {/* Hint Bubble */}
        <div className="h-8 flex items-center justify-center w-full px-4">
            {loadingHint ? (
                <div className="text-xs font-mono text-cyan-400 animate-pulse">{t.status.uplink}</div>
            ) : hint ? (
                <div className="text-xs font-mono text-yellow-300 bg-yellow-900/30 border border-yellow-600/50 px-3 py-2 rounded animate-in fade-in slide-in-from-top-2">
                    <span className="font-bold mr-2">OP:</span>{hint}
                </div>
            ) : null}
        </div>

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

        {/* Footer / Controls */}
        <div className="w-full flex justify-between items-center px-2">
            <div className="flex gap-4 text-xs text-slate-500 font-mono uppercase tracking-wide">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]"></span> {t.status.req}</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-900"></span> {t.status.bug}</div>
            </div>

            <div className="flex gap-2">
                {!isWon && (
                    <button 
                        onClick={requestHint}
                        disabled={loadingHint}
                        className="px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 text-xs font-bold rounded border border-cyan-800/50 transition-colors disabled:opacity-50"
                    >
                        {loadingHint ? '...' : t.buttons.hint}
                    </button>
                )}

                {mode === 'PRACTICE' && (
                    <button 
                        onClick={handleNewPractice}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors"
                    >
                        {t.buttons.reset}
                    </button>
                )}
            </div>
        </div>
        
        {/* Theme Name Footer */}
        {theme && (
            <div className="text-center opacity-40">
                <p className="text-[10px] font-mono tracking-[0.2em] text-cyan-500 uppercase">{theme.name}</p>
            </div>
        )}

      </main>

      {/* Intro Modal */}
      <Modal isOpen={showIntro} onClose={() => setShowIntro(false)} title={mode === 'DAILY' ? t.intro.dailyTitle : t.intro.simTitle}>
        <div className="space-y-4">
            <div className="text-sm text-slate-400 italic border-l-2 border-blue-500 pl-3">
               "{theme?.description || "System Link Established."}"
            </div>
            
            {mode === 'DAILY' ? (
                 <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded text-xs text-blue-200">
                    {t.intro.dailyMission}
                 </div>
            ) : (
                <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded text-xs text-purple-200">
                    {t.intro.simMission}
                 </div>
            )}

            <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">👉 <strong>{t.intro.li1}</strong></li>
                <li className="flex items-center gap-2">⚡ <strong>{t.intro.li2}</strong></li>
                <li className="flex items-center gap-2">🚫 <strong>{t.intro.li3}</strong></li>
                <li className="flex items-center gap-2">🤖 <strong>{t.intro.li4}</strong></li>
            </ul>
            <button 
                onClick={handleStartGame}
                className={`w-full py-3 font-bold rounded-lg transition-all text-white ${mode === 'DAILY' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'}`}
            >
                {mode === 'DAILY' ? t.buttons.startDaily : t.buttons.startSim}
            </button>
        </div>
      </Modal>

      {/* Win Modal */}
      <Modal isOpen={showWin} onClose={() => setShowWin(false)} title={t.win.title}>
        <div className="space-y-6 text-center">
            <div className="text-6xl animate-bounce">⚡</div>
            <div>
                <h3 className="text-2xl font-bold text-white">{t.win.systemOnline}</h3>
                <p className="text-slate-400">{moves} {t.moves.toLowerCase()}</p>
            </div>
            
            {winData ? (
                <div className="space-y-3">
                    <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase tracking-widest animate-pulse">
                        {winData.rank}
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg text-sm italic text-yellow-100/80 border border-slate-700">
                        <span className="block text-xs text-slate-500 not-italic mb-1 font-bold">{t.win.aiLog}:</span>
                        "{winData.comment}"
                    </div>
                </div>
            ) : (
                <div className="text-xs text-slate-500 animate-pulse">{t.win.calculating}</div>
            )}

            <div className="flex gap-2">
                <button 
                    onClick={copyShare}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all"
                >
                    {t.buttons.share}
                </button>
                {mode === 'PRACTICE' && (
                    <button 
                        onClick={handleNewPractice}
                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all"
                    >
                        {t.buttons.next}
                    </button>
                )}
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;