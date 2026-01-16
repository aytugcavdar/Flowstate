
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getDailyTheme, getWinningCommentary, getGameHint } from './services/geminiService';
import { playSound, startAmbience, setMusicIntensity, stopAmbience } from './services/audio';
import { getProfile, checkBadgesOnWin, generateDailyMissions } from './services/progression';
import { Tile } from './components/Tile';
import { Modal } from './components/Modal';
import { CyberpunkOverlay } from './components/CyberpunkOverlay';
import { Header } from './components/Header';
import { GameControls } from './components/GameControls';
import { TerminalWinScreen } from './components/TerminalWinScreen';
import { ProfileModal } from './components/ProfileModal';
import { MissionBoard } from './components/MissionBoard';
import { TRANSLATIONS, Language } from './constants/translations';
import { DailyStats, DailyTheme, TileType, WinAnalysis, PlayerProfile, DailyMission } from './types';
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

  // --- Auxiliary State ---
  const [theme, setTheme] = useState<DailyTheme | null>(null);
  const [winData, setWinData] = useState<WinAnalysis | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [showHackEffect, setShowHackEffect] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showWin, setShowWin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [stats, setStats] = useState<DailyStats>({ streak: 0, lastPlayed: '', history: {}, completedMissions: [] });
  const [missions, setMissions] = useState<DailyMission[]>([]);
  
  // Progression State
  const [profile, setProfile] = useState<PlayerProfile>(getProfile());
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [lastXpGained, setLastXpGained] = useState(0); 
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]); // For win screen
  const [gameTimeMs, setGameTimeMs] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const startTimeRef = useRef<number>(0);

  const t = TRANSLATIONS[lang];

  // --- Effects ---

  // Load Stats, Theme, Missions
  useEffect(() => {
      const savedStats = localStorage.getItem(STORAGE_KEY_STATS);
      if (savedStats) setStats(JSON.parse(savedStats));
      
      getDailyTheme(mode === 'DAILY' ? currentKey : 'CYBERPUNK_RANDOM', lang).then(setTheme);
      setProfile(getProfile());

      if (mode === 'DAILY') {
          setMissions(generateDailyMissions(currentKey));
      } else {
          setMissions([]);
      }
  }, [currentKey, mode, lang]);

  // Timer Logic
  useEffect(() => {
      if (loading || isWon) return;
      if (moves === 0) startTimeRef.current = Date.now();
  }, [loading, isWon, moves]);

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
        // Calculate Time
        const duration = Date.now() - startTimeRef.current;
        setGameTimeMs(duration);

        // Check Badges & XP & Missions
        const { newProfile, newBadges, xpGained, newCompletedMissions } = checkBadgesOnWin(
            profile, 
            duration, 
            usedHint, 
            moves, 
            mode, 
            grid,
            stats.streak,
            missions,
            stats.completedMissions || []
        );

        setProfile(newProfile);
        setUnlockedBadges(newBadges);
        setLastXpGained(xpGained);
        setCompletedMissionIds([...(stats.completedMissions || []), ...newCompletedMissions]);

        // Save Stats Update (Streaks + Missions)
        if (mode === 'DAILY') {
            const newStats = { ...stats };
            
            // Streak Logic
            if (newStats.lastPlayed !== currentKey) {
                newStats.streak += 1;
                newStats.lastPlayed = currentKey;
                newStats.history[currentKey] = moves;
                newStats.completedMissions = []; // Reset if new day, though currentKey check handles it implicitly usually
            }
            
            // Append new missions
            if (!newStats.completedMissions) newStats.completedMissions = [];
            newCompletedMissions.forEach(id => {
                if (!newStats.completedMissions.includes(id)) newStats.completedMissions.push(id);
            });

            setStats(newStats);
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));
        }

        setTimeout(() => handleWin(), 1000);
    }
  }, [isWon]);

  // Reset hints on new level
  useEffect(() => {
      setUsedHint(false);
      startTimeRef.current = Date.now();
  }, [currentKey]);

  // --- Handlers ---

  const handleWin = async () => {
    setShowHackEffect(true);
    playSound('win');
    const data = await getWinningCommentary(moves, grid, lang);
    setWinData(data);
  };

  const requestHint = async () => {
      if (loadingHint || isWon) return;
      setLoadingHint(true);
      setUsedHint(true); // Mark as used
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
      startTimeRef.current = Date.now();
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

  const nextLevel = () => {
      setPracticeSeed(Date.now().toString());
      setShowWin(false);
      setWinData(null);
      setUnlockedBadges([]);
      setUsedHint(false);
      startAmbience();
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 font-mono animate-pulse">{t.status.initializing}</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col items-center">
      {showHackEffect && <CyberpunkOverlay onComplete={() => { setShowHackEffect(false); setShowWin(true); }} lang={lang} />}

      <Header 
        moves={moves} 
        mode={mode} 
        lang={lang} 
        setLang={(l) => { setLang(l); playSound('click'); }} 
        setMode={handleModeSwitch} 
        onOpenProfile={() => setShowProfile(true)}
        profile={profile}
      />

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
            onNewLevel={nextLevel}
        />

        {theme && <div className="text-center opacity-40 mt-2"><p className="text-[10px] font-mono tracking-[0.2em] text-cyan-500 uppercase">{theme.name}</p></div>}
      </main>

      {/* Modals */}
      <Modal isOpen={showIntro} onClose={() => setShowIntro(false)} title={mode === 'DAILY' ? t.intro.dailyTitle : t.intro.simTitle}>
        <div className="space-y-3">
            <div className="text-sm text-slate-400 italic border-l-2 border-cyan-500 pl-3">"{theme?.description || "Color mixing protocols engaged."}"</div>
            
            {mode === 'DAILY' && <MissionBoard missions={missions} stats={stats} lang={lang} />}

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

      <ProfileModal 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
        profile={profile} 
        lang={lang} 
      />

      {showWin && (
          <TerminalWinScreen 
            moves={moves}
            timeMs={gameTimeMs}
            unlockedBadges={unlockedBadges}
            winAnalysis={winData}
            lang={lang}
            onShare={copyShare}
            onNext={nextLevel}
            onClose={() => setShowWin(false)}
            mode={mode}
            xpGained={lastXpGained}
            missions={mode === 'DAILY' ? missions : undefined}
            completedMissionIds={completedMissionIds}
            streak={stats.streak}
          />
      )}
    </div>
  );
};

export default App;
