import React, { useEffect, useState } from 'react';
import { playSound } from '../services/audio';
import { Language, TRANSLATIONS } from '../constants/translations';

interface CyberpunkOverlayProps {
  onComplete: () => void;
  lang: Language;
}

export const CyberpunkOverlay: React.FC<CyberpunkOverlayProps> = ({ onComplete, lang }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [showBigSuccess, setShowBigSuccess] = useState(false);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    let delay = 0;
    
    // Play logs sequentially
    t.logs.forEach((msg, index) => {
      // Varying speed for "typing" effect feel
      delay += Math.random() * 300 + 150; 
      
      setTimeout(() => {
        playSound('click'); // Mechanical typing sound
        setLogs(prev => [...prev, msg]);
        
        // Scroll to bottom
        const el = document.getElementById('hack-logs');
        if (el) el.scrollTop = el.scrollHeight;

      }, delay);
    });

    // Show big success text after logs
    const climaxDelay = delay + 600;
    setTimeout(() => {
      setShowBigSuccess(true);
      playSound('power'); // Big power up sound
    }, climaxDelay);

    // End animation and trigger callback
    setTimeout(() => {
      onComplete();
    }, climaxDelay + 2000); // Keep result on screen for 2 seconds

  }, [onComplete, t.logs]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center font-mono overflow-hidden">
      {/* Background CRT Effects */}
      <div className="absolute inset-0 scanlines opacity-30"></div>
      <div className="absolute inset-0 bg-green-900/10 animate-pulse"></div>

      {/* Console Output */}
      {!showBigSuccess && (
        <div 
            id="hack-logs"
            className="w-full max-w-md p-6 h-64 overflow-y-auto flex flex-col gap-2 text-xs sm:text-sm text-green-500 font-bold"
        >
          {logs.map((log, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="opacity-50 mr-2">{`>`}</span>
              {log}
            </div>
          ))}
          <div className="animate-pulse">_</div>
        </div>
      )}

      {/* Climax Success Screen */}
      {showBigSuccess && (
        <div className="relative z-10 flex flex-col items-center animate-in zoom-in duration-300">
           <div className="text-6xl sm:text-8xl mb-4 animate-bounce">⚡</div>
           <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 tracking-tighter text-glow animate-glitch text-center">
             {t.success.system}<br/>{t.success.online}
           </h1>
           <div className="mt-4 px-4 py-1 bg-green-500/20 border border-green-500 text-green-400 text-xs tracking-[0.3em]">
             {t.success.access}
           </div>
        </div>
      )}
    </div>
  );
};