
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
  
  const [charges, setCharges] = useState(0); // For Capacitor Ability

  // Animation States
  const [showHackEffect, setShowHackEffect] = useState(false);
  
  // Practice
  const [practiceSeed, setPracticeSeed] = useState(Date.now().toString());
  
  // AI/Theme
  const [theme, setTheme] = useState<DailyTheme | null>(null);
  const [winData, setWinData] = useState<WinAnalysis | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  
  // Modals
  const [showIntro, setShowIntro] = useState(false);
  const [showWin, setShowWin] = useState(false);
  
  const [stats, setStats] = useState<DailyStats>({ streak: 0, lastPlayed: '', history: {} });
  const t = TRANSLATIONS[lang];

  const currentKey = useMemo(() => {
    if (mode === 'DAILY') {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    } else {
      return `PRACTICE_${practiceSeed}`;
    }
  }, [mode, practiceSeed]);

  const storageKey = useMemo(() => {
     return mode === 'DAILY' ? `${STORAGE_KEY_STATE}_DAILY_V4` : `${STORAGE_KEY_STATE}_PRACTICE_V4`;
  }, [mode]);

  // --- Dynamic Music ---
  useEffect(() => {
    if (loading || grid.length === 0 || isWon) return;
    let poweredTiles = 0;
    let totalTiles = 0;
    grid.forEach(row => row.forEach(tile => {
        if (tile.type !== TileType.EMPTY) {
            totalTiles++;
            if (tile.hasFlow) poweredTiles++;
        }
    }));
    const intensity = totalTiles > 0 ? (poweredTiles / totalTiles) : 0;
    setMusicIntensity(intensity);
  }, [grid, isWon, loading]);

  // --- Init ---
  useEffect(() => {
    const initGame = async () => {
      setLoading(true);
      setShowWin(false);
      setWinData(null);
      setHint(null);
      setShowHackEffect(false);
      setCharges(0);
      
      stopAmbience();
      
      const savedStats = localStorage.getItem(STORAGE_KEY_STATS);
      if (savedStats) setStats(JSON.parse(savedStats));

      getDailyTheme(mode === 'DAILY' ? currentKey : 'CYBERPUNK_RANDOM', lang).then(setTheme);

      const savedStateStr = localStorage.getItem(storageKey);
      let loadedState: GameState | null = savedStateStr ? JSON.parse(savedStateStr) : null;

      if (loadedState && loadedState.gameDate === currentKey) {
        setGrid(loadedState.grid);
        setMoves(loadedState.moves);
        setIsWon(loadedState.isWon);
        setCharges(loadedState.charges || 0);
        if (loadedState.isWon) setShowWin(true);
        setShowIntro(false); 
      } else {
        const newGrid = generateDailyLevel(currentKey);
        setGrid(newGrid);
        setMoves(0);
        setIsWon(false);
        setCharges(0);
        setShowIntro(true);
      }
      setLoading(false);
    };

    initGame();
  }, [currentKey, storageKey, mode, lang]);

  // --- Persistence ---
  useEffect(() => {
    if (!loading && grid.length > 0) {
      const state: GameState = { grid, moves, isWon, gameDate: currentKey, charges };
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [grid, moves, isWon, charges, loading, currentKey, storageKey]);

  // --- Special Mechanics ---
  useEffect(() => {
      if (loading || isWon) return;
      
      // 1. Key Logic
      let keyPowered = false;
      let capPowered = false;
      
      grid.flat().forEach(t => {
          if (t.status === NodeStatus.KEY && t.hasFlow) keyPowered = true;
          if (t.status === NodeStatus.CAPACITOR && t.hasFlow) capPowered = true;
      });

      // Unlock Locks
      const hasLockedNodes = grid.flat().some(t => t.status === NodeStatus.LOCKED && t.fixed);
      if (keyPowered && hasLockedNodes) {
          playSound('power'); 
          setGrid(prev => prev.map(row => row.map(t => {
              if (t.status === NodeStatus.LOCKED) return { ...t, fixed: false };
              return t;
          })));
      }

      // Charge Capacitor
      // We only charge once when it hits.
      // Since useEffect runs often, we check if we already have charges.
      // Logic: If powered and charges == 0, set charges = 1.
      if (capPowered && charges === 0) {
          playSound('power');
          setCharges(1);
      }

  }, [grid, isWon, loading, charges]);

  const handleStartGame = () => {
      setShowIntro(false);
      startAmbience();
      playSound('power');
  };

  const handleResetPuzzle = () => {
      if (isWon) return;
      playSound('glitch'); 
      const resetGrid = generateDailyLevel(currentKey);
      setGrid(resetGrid);
      setMoves(0);
      setCharges(0);
      setHint(null);
  };

  const handleNewPractice = () => {
      setPracticeSeed(Date.now().toString());
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
      setTimeout(() => setHint(null), 8000);
  };

  const toggleLanguage = () => {
      setLang(prev => prev === 'en' ? 'tr' : 'en');
      playSound('click');
  };

  const handleTileClick = useCallback((r: number, c: number) => {
    if (isWon) return;
    const tile = grid[r][c];
    
    // OVERLOAD ABILITY: If clicking a BUG and we have Charge
    if (tile.status === NodeStatus.FORBIDDEN && charges > 0) {
        playSound('power'); // Zap sound
        const newGrid = grid.map(row => row.map(t => ({...t})));
        // Transform Bug into Normal Pipe
        newGrid[r][c] = {
            ...newGrid[r][c],
            status: NodeStatus.NORMAL,
            fixed: false
        };
        // Use Charge
        setCharges(0);
        // Recalculate
        const flowedGrid = calculateFlow(newGrid);
        setGrid(flowedGrid);
        return;
    }

    if (tile.fixed) {
        if (tile.status === NodeStatus.LOCKED) playSound('click');
        return;
    }
    
    startAmbience();
    playSound('rotate');
    if (hint) setHint(null);

    const newGrid = grid.map(row => row.map(t => ({ ...t })));
    newGrid[r][c].rotation = (newGrid[r][c].rotation + 1) % 4;
    
    const flowedGrid = calculateFlow(newGrid);
    
    // Check Glitch
    const hasNewGlitch = flowedGrid.flat().some((t, i) => 
       t.status === NodeStatus.FORBIDDEN && t.hasFlow && !grid.flat()[i].hasFlow
    );
    
    if (hasNewGlitch) {
        playSound('glitch');
        if (navigator.vibrate) navigator.vibrate(50);
    }

    const prevPower = grid.flat().filter(t => t.hasFlow).length;
    const newPower = flowedGrid.flat().filter(t => t.hasFlow).length;
    if (newPower > prevPower && !hasNewGlitch) {
        playSound('power');
    }

    setGrid(flowedGrid);
    setMoves(m => m + 1);

    const won = checkWinCondition(flowedGrid);
    if (won) {
      setIsWon(true);
      setTimeout(() => {
        handleWin(moves + 1, flowedGrid);
      }, 1000);
    }
  }, [grid, isWon, moves, hint, charges]);

  const handleWin = async (finalMoves: number, finalGrid: GameState['grid']) => {
    setShowHackEffect(true);
    playSound('win');
    
    if (mode === 'DAILY') {
        const newStats = { ...stats };
        if (newStats.lastPlayed !== currentKey) {
            newStats.streak += 1;
            newStats.lastPlayed = currentKey;
            newStats.history[currentKey] = finalMoves;
            setStats(newStats);
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));
        }
    }
    const data = await getWinningCommentary(finalMoves, finalGrid, lang);
    setWinData(data);
  };

  const onHackAnimComplete = () => {
    setShowHackEffect(false);
    setShowWin(true);
  };

  const generateShareText = () => {
    const modeText = mode === 'DAILY' ? `${t.shareTemplate.daily} ${currentKey}` : t.shareTemplate.practice;
    return `${t.title} ${modeText}\n${moves} ${t.shareTemplate.moves}\n⚡ SYSTEM HACKED`;
  };

  const copyShare = () => {
    navigator.clipboard.writeText(generateShareText());
    alert(t.win.shareText);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-mono animate-pulse">{t.status.initializing}</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center">
      {showHackEffect && <CyberpunkOverlay onComplete={onHackAnimComplete} lang={lang} />}

      <header className="w-full max-w-lg p-4 pb-2 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex justify-between items-start mb-4">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
                    {t.title}
                    </h1>
                    <button onClick={toggleLanguage} className="text-[10px] bg-slate-800 border border-slate-700 px-1 rounded">{lang === 'en' ? 'TR' : 'EN'}</button>
                </div>
            </div>
            
            <div className="text-right">
                <span className="block text-slate-500 text-[10px] uppercase tracking-wider">{t.moves}</span>
                <span className="text-white font-bold font-mono text-xl">{moves}</span>
            </div>
        </div>

        <div className="flex p-1 bg-slate-800/50 rounded-lg backdrop-blur-sm mb-2">
            <button 
                onClick={() => { handleModeSwitch('DAILY'); stopAmbience(); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'DAILY' ? 'bg-cyan-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                {t.modes.daily}
            </button>
            <button 
                onClick={() => { handleModeSwitch('PRACTICE'); stopAmbience(); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'PRACTICE' ? 'bg-fuchsia-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                {t.modes.practice}
            </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg p-2 flex flex-col items-center justify-center gap-4">
        
        {/* Ability Status Bar */}
        <div className="w-full flex justify-between items-center px-2 py-1 bg-slate-900 rounded border border-slate-800">
            <div className="text-xs text-slate-500 font-mono">ABILITY:</div>
            <div className={`text-xs font-bold font-mono ${charges > 0 ? 'text-blue-400 animate-pulse' : 'text-slate-700'}`}>
                {charges > 0 ? "CAPACITOR READY [CLICK BUG]" : "CAPACITOR EMPTY"}
            </div>
        </div>

        <div className="h-6 flex items-center justify-center w-full px-4">
             {hint && <div className="text-xs font-mono text-yellow-300 bg-yellow-900/30 px-3 py-1 rounded border border-yellow-600/50">{hint}</div>}
        </div>

        <div 
            className={`grid gap-0.5 p-1 bg-slate-900 rounded-xl shadow-2xl border transition-all duration-1000 ${isWon ? 'border-white shadow-[0_0_30px_rgba(255,255,255,0.3)]' : 'border-slate-800'}`}
            style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
                width: '100%',
                aspectRatio: '1/1'
            }}
        >
          {grid.map((row, r) => 
            row.map((tile, c) => (
              <div key={`${r}-${c}`} className="w-full h-full">
                <Tile tile={tile} onClick={() => handleTileClick(r, c)} isWon={isWon} />
              </div>
            ))
          )}
        </div>

        <div className="w-full flex justify-between items-center px-2">
            <div className="flex gap-2">
                {!isWon && (
                    <button onClick={requestHint} disabled={loadingHint} className="px-3 py-1.5 bg-cyan-900/30 text-cyan-400 text-xs font-bold rounded border border-cyan-800/50">
                        {loadingHint ? '...' : t.buttons.hint}
                    </button>
                )}
                {!isWon && (
                    <button onClick={handleResetPuzzle} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded border border-slate-700">
                        {t.buttons.reset}
                    </button>
                )}
            </div>
            {mode === 'PRACTICE' && !isWon && (
                <button onClick={handleNewPractice} className="px-3 py-1.5 bg-purple-900/30 text-purple-400 text-xs font-bold rounded border border-purple-800/50">
                    {t.buttons.newLevel}
                </button>
            )}
        </div>
        
        {theme && (
            <div className="text-center opacity-40">
                <p className="text-[10px] font-mono tracking-[0.2em] text-cyan-500 uppercase">{theme.name}</p>
            </div>
        )}
      </main>

      <Modal isOpen={showIntro} onClose={() => setShowIntro(false)} title={mode === 'DAILY' ? t.intro.dailyTitle : t.intro.simTitle}>
        <div className="space-y-4">
            <div className="text-sm text-slate-400 italic border-l-2 border-cyan-500 pl-3">
               "{theme?.description || "Color mixing protocols engaged."}"
            </div>
            <div className="bg-slate-800 p-3 rounded text-xs space-y-2">
                <div className="flex items-center gap-2"><span className="text-cyan-400 font-bold">CYAN</span> + <span className="text-fuchsia-400 font-bold">MAGENTA</span> = <span className="text-white font-bold">WHITE</span></div>
                <div className="text-slate-400">Sink requires <strong>WHITE</strong> energy.</div>
                <div className="text-slate-400">Use <strong>Bridges</strong> to cross paths without mixing.</div>
                <div className="text-slate-400">Charge the <strong>Capacitor</strong> to delete Bugs.</div>
            </div>
            <button 
                onClick={handleStartGame}
                className={`w-full py-3 font-bold rounded-lg transition-all text-white ${mode === 'DAILY' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500'}`}
            >
                {t.buttons.startDaily}
            </button>
        </div>
      </Modal>

      <Modal isOpen={showWin} onClose={() => setShowWin(false)} title={t.win.title}>
        <div className="space-y-6 text-center">
            <div className="text-6xl animate-bounce">⚡</div>
            <div>
                <h3 className="text-2xl font-bold text-white">{t.win.systemOnline}</h3>
                <p className="text-slate-400">{moves} {t.moves.toLowerCase()}</p>
            </div>
            {winData && (
                <div className="bg-slate-800 p-3 rounded-lg text-sm italic text-yellow-100/80 border border-slate-700">
                    "{winData.comment}"
                </div>
            )}
            <div className="flex gap-2">
                <button onClick={copyShare} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg">
                    {t.buttons.share}
                </button>
                {mode === 'PRACTICE' && (
                    <button onClick={handleNewPractice} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg">
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
