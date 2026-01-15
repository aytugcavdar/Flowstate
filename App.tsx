
import React, { useState, useEffect, useMemo } from 'react';
import { getDailyTheme, getWinningCommentary, getGameHint } from './services/geminiService';
import { playSound, startAmbience, setMusicIntensity, stopAmbience } from './services/audio';
import { Tile } from './components/Tile';
import { Modal } from './components/Modal';
import { CyberpunkOverlay } from './components/CyberpunkOverlay';
import { Header } from './components/Header';
import { GameControls } from './components/GameControls';
import { TRANSLATIONS, Language } from './constants/translations';
import { DailyStats, DailyTheme, TileType, WinAnalysis } from './types';
import { STORAGE_KEY_STATS, GRID_SIZE } from './constants';
import { useGameState } from './hooks/useGameState';

type GameMode = 'DAILY' | 'PRACTICE';

const App: React.FC = () => {
  // --- UI State ---
  const [lang, setLang] = useState<Language>('en');
  const [mode, setMode] = useState<GameMode>('DAILY');
  const [practiceSeed, setPracticeSeed] = useState(Date.now().toString());
  
  // Computed Game Key
  const currentKey = useMemo(() => {
    if (mode === 'DAILY') {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    return `PRACTICE_${practiceSeed}`;
  }, [mode, practiceSeed]);

  // --- Game State Hook ---
  const { grid, moves, isWon, charges, loading, onTileClick, resetGame } = useGameState(currentKey);

  // --- Auxiliary State (Theme, Stats, Modals) ---
  const [theme, setTheme] = useState<DailyTheme | null>(null);
  const [winData, setWinData] = useState<WinAnalysis | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [showHackEffect, setShowHackEffect] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showWin, setShowWin] = useState(false);
  const [stats, setStats] = useState<DailyStats>({ streak: 0, lastPlayed: '', history: {} });
  
  const t = TRANSLATIONS[lang];

  // --- Effects ---

  // Load Stats & Theme
  useEffect(() => {
      const savedStats = localStorage.getItem(STORAGE_KEY_STATS);
      if (savedStats) setStats(JSON.parse(savedStats));
      getDailyTheme(mode === 'DAILY' ? currentKey : 'CYBERPUNK_RANDOM', lang).then(setTheme);
  }, [currentKey, mode, lang]);

  // Dynamic Audio
  useEffect(() => {
    if (loading || grid.length === 0 || isWon) return;
    let powered = 0, total = 0;
    grid.forEach(row => row.forEach(tile => {
        if (tile.type !== TileType.EMPTY) {
            total++;
            if (tile.hasFlow) powered++;
        }
    }));
    setMusicIntensity(total > 0 ? (powered / total) : 0);
  }, [grid, isWon, loading]);

  // Win Handler
  useEffect(() => {
    if (isWon && !showHackEffect && !showWin) {
        setTimeout(() => handleWin(), 1000);
    }
  }, [isWon]);

  // --- Handlers ---

  const handleWin = async () => {
    setShowHackEffect(true);
    playSound('win');
    
    if (mode === 'DAILY') {
        const newStats = { ...stats };
        if (newStats.lastPlayed !== currentKey) {
            newStats.streak += 1;
            newStats.lastPlayed = currentKey;
            newStats.history[currentKey] = moves;
            setStats(newStats);
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));
        }
    }
    const data = await getWinningCommentary(moves, grid, lang);
    setWinData(data);
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

  const handleStartGame = () => {
      setShowIntro(false);
      startAmbience();
      playSound('power');
  };

  const handleModeSwitch = (newMode: GameMode) => {
      setMode(newMode);
      setPracticeSeed(Date.now().toString());
      setShowIntro(true);
      setShowWin(false);
      stopAmbience();
  };

  const copyShare = () => {
    const modeText = mode === 'DAILY' ? `${t.shareTemplate.daily} ${currentKey}` : t.shareTemplate.practice;
    const text = `${t.title} ${modeText}\n${moves} ${t.shareTemplate.moves}\n⚡ SYSTEM HACKED`;
    navigator.clipboard.writeText(text);
    alert(t.win.shareText);
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-mono animate-pulse">{t.status.initializing}</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center">
      {showHackEffect && <CyberpunkOverlay onComplete={() => { setShowHackEffect(false); setShowWin(true); }} lang={lang} />}

      <Header moves={moves} mode={mode} lang={lang} setLang={(l) => { setLang(l); playSound('click'); }} setMode={handleModeSwitch} />

      {/* Main Game Area */}
      <main className="flex-1 w-full max-w-lg p-2 flex flex-col items-center justify-center gap-4">
        
        {/* Hint Display */}
        <div className="h-6 flex items-center justify-center w-full px-4">
             {hint && <div className="text-xs font-mono text-yellow-300 bg-yellow-900/30 px-3 py-1 rounded border border-yellow-600/50 animate-in fade-in slide-in-from-top-2">{hint}</div>}
        </div>

        {/* Grid */}
        <div 
            className={`grid gap-0.5 p-1 bg-slate-900 rounded-xl shadow-2xl border transition-all duration-1000 ${isWon ? 'border-white shadow-[0_0_30px_rgba(255,255,255,0.3)]' : 'border-slate-800'}`}
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, width: '100%', aspectRatio: '1/1' }}
        >
          {grid.map((row, r) => row.map((tile, c) => (
              <div key={`${r}-${c}`} className="w-full h-full">
                <Tile tile={tile} onClick={() => onTileClick(r, c)} isWon={isWon} charges={charges} row={r} />
              </div>
          )))}
        </div>

        <GameControls 
            isWon={isWon}
            loadingHint={loadingHint}
            mode={mode}
            charges={charges}
            lang={lang}
            onRequestHint={requestHint}
            onReset={resetGame}
            onNewLevel={() => setPracticeSeed(Date.now().toString())}
        />

        {theme && <div className="text-center opacity-40 mt-2"><p className="text-[10px] font-mono tracking-[0.2em] text-cyan-500 uppercase">{theme.name}</p></div>}
      </main>

      {/* Modals */}
      <Modal isOpen={showIntro} onClose={() => setShowIntro(false)} title={mode === 'DAILY' ? t.intro.dailyTitle : t.intro.simTitle}>
        <div className="space-y-4">
            <div className="text-sm text-slate-400 italic border-l-2 border-cyan-500 pl-3">"{theme?.description || "Color mixing protocols engaged."}"</div>
            <div className="bg-slate-800 p-3 rounded text-xs space-y-2 text-slate-400">
                <div className="flex items-center gap-2 text-white bg-slate-900/50 p-2 rounded"><span className="text-cyan-400 font-bold">CYAN</span> + <span className="text-fuchsia-400 font-bold">MAGENTA</span> = WHITE</div>
                <div className="grid grid-cols-2 gap-2">
                   <div>🔹 {t.intro.li1}</div>
                   <div>⚡ {t.intro.li2}</div>
                   <div>🚫 {t.intro.li3}</div>
                </div>
            </div>
            <button onClick={handleStartGame} className={`w-full py-3 font-bold rounded-lg transition-all text-white ${mode === 'DAILY' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500'}`}>{mode === 'DAILY' ? t.buttons.startDaily : t.buttons.startSim}</button>
        </div>
      </Modal>

      <Modal isOpen={showWin} onClose={() => setShowWin(false)} title={t.win.title}>
        <div className="space-y-6 text-center">
            <div className="text-6xl animate-bounce">⚡</div>
            <div><h3 className="text-2xl font-bold text-white">{t.win.systemOnline}</h3><p className="text-slate-400">{moves} {t.moves.toLowerCase()}</p></div>
            {winData && <div className="bg-slate-800 p-3 rounded-lg text-sm italic text-yellow-100/80 border border-slate-700">"{winData.comment}"</div>}
            <div className="flex gap-2">
                <button onClick={copyShare} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg">{t.buttons.share}</button>
                {mode === 'PRACTICE' && <button onClick={() => setPracticeSeed(Date.now().toString())} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg">{t.buttons.next}</button>}
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
