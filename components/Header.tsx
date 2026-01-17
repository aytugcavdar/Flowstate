
import React from 'react';
import { TRANSLATIONS, Language } from '../constants/translations';
import { PlayerProfile, CampaignLevel } from '../types';

interface HeaderProps {
    moves: number;
    mode: string; // 'DAILY' | 'PRACTICE' | 'CAMPAIGN'
    lang: Language;
    setLang: (l: Language) => void;
    setMode: (m: 'DAILY' | 'PRACTICE' | 'CAMPAIGN') => void;
    onOpenProfile: () => void;
    profile: PlayerProfile;
    campaignLevel?: CampaignLevel | null;
    currentStars?: number; // 0-3 for current run
}

export const Header: React.FC<HeaderProps> = ({ moves, mode, lang, setLang, setMode, onOpenProfile, profile, campaignLevel, currentStars }) => {
    const t = TRANSLATIONS[lang];
    
    return (
        <header className="w-full max-w-lg p-4 pb-2 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">{t.title}</h1>
                    <button onClick={() => setLang(lang === 'en' ? 'tr' : 'en')} className="text-[10px] bg-slate-800 border border-slate-700 px-1 rounded hover:bg-slate-700 transition-colors">{lang === 'en' ? 'TR' : 'EN'}</button>
                </div>
                <div className="text-right flex items-center gap-4">
                    {/* Level Indicator */}
                    <button onClick={onOpenProfile} className="flex flex-col items-end group">
                        <div className="flex items-center gap-2">
                             <span className="text-xs text-yellow-500 font-bold tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">LVL {profile.level}</span>
                             <span className="text-2xl hover:scale-110 transition-transform">👤</span>
                        </div>
                        <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-yellow-500" style={{ width: `${(profile.xp % 1000) / 10}%` }}></div>
                        </div>
                    </button>

                    <div>
                        <span className="block text-slate-500 text-[10px] uppercase tracking-wider">{t.moves}</span>
                        <div className="flex items-baseline gap-2 justify-end">
                            <span className="text-white font-bold font-mono text-xl">{moves}</span>
                            {/* Star Preview for Campaign */}
                            {mode === 'CAMPAIGN' && currentStars !== undefined && (
                                <div className="flex text-xs">
                                    {[1,2,3].map(s => (
                                        <span key={s} className={s <= currentStars ? 'text-yellow-400' : 'text-slate-800'}>★</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Mode Switcher or Level Title */}
            {mode === 'CAMPAIGN' && campaignLevel ? (
                 <div className="bg-slate-800/80 p-2 rounded flex justify-between items-center animate-in slide-in-from-top-2">
                     <button onClick={() => setMode('CAMPAIGN')} className="text-xs text-cyan-400 hover:underline">← {t.buttons.back}</button>
                     <span className="text-xs font-bold text-white tracking-widest">{campaignLevel.title.toUpperCase()}</span>
                     <div className="text-[10px] text-slate-400">PAR: {campaignLevel.parMoves}</div>
                 </div>
            ) : (
                <div className="flex p-1 bg-slate-800/50 rounded-lg backdrop-blur-sm mb-2">
                    {(['DAILY', 'PRACTICE', 'CAMPAIGN'] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all ${mode === m ? (m==='DAILY'?'bg-cyan-700': m==='CAMPAIGN' ? 'bg-yellow-700' : 'bg-fuchsia-700') + ' text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                            {m === 'DAILY' ? t.modes.daily : m === 'CAMPAIGN' ? t.modes.campaign : t.modes.practice}
                        </button>
                    ))}
                </div>
            )}
        </header>
    );
};
