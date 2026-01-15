
import React from 'react';
import { TRANSLATIONS, Language } from '../constants/translations';

interface GameControlsProps {
    isWon: boolean;
    loadingHint: boolean;
    mode: 'DAILY' | 'PRACTICE';
    charges: number;
    lang: Language;
    onRequestHint: () => void;
    onReset: () => void;
    onNewLevel: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({ 
    isWon, loadingHint, mode, charges, lang, onRequestHint, onReset, onNewLevel 
}) => {
    const t = TRANSLATIONS[lang];

    return (
        <div className="w-full flex flex-col gap-3 px-2">
            {/* Ability Bar */}
            <div className="w-full flex justify-between items-center px-3 py-2 bg-slate-900/80 rounded border border-slate-800 backdrop-blur-sm">
                <div className="text-xs text-slate-500 font-mono">ABILITY:</div>
                <div className={`text-xs font-bold font-mono ${charges > 0 ? 'text-blue-400 animate-pulse drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]' : 'text-slate-700'}`}>
                    {charges > 0 ? "CAPACITOR READY [CLICK BUG]" : "CAPACITOR EMPTY"}
                </div>
            </div>

            {/* Buttons */}
            <div className="w-full flex justify-between items-center">
                <div className="flex gap-2">
                    {!isWon && (
                        <>
                            <button onClick={onRequestHint} disabled={loadingHint} className="px-4 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 text-xs font-bold rounded border border-cyan-800/50 transition-colors disabled:opacity-50">
                                {loadingHint ? '...' : t.buttons.hint}
                            </button>
                            <button onClick={onReset} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors">
                                {t.buttons.reset}
                            </button>
                        </>
                    )}
                </div>
                {mode === 'PRACTICE' && !isWon && (
                    <button onClick={onNewLevel} className="px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 text-xs font-bold rounded border border-purple-800/50 transition-colors">
                        {t.buttons.newLevel}
                    </button>
                )}
            </div>
        </div>
    );
};
