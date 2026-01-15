
import React from 'react';
import { TRANSLATIONS, Language } from '../constants/translations';

interface HeaderProps {
    moves: number;
    mode: 'DAILY' | 'PRACTICE';
    lang: Language;
    setLang: (l: Language) => void;
    setMode: (m: 'DAILY' | 'PRACTICE') => void;
}

export const Header: React.FC<HeaderProps> = ({ moves, mode, lang, setLang, setMode }) => {
    const t = TRANSLATIONS[lang];
    
    return (
        <header className="w-full max-w-lg p-4 pb-2 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">{t.title}</h1>
                    <button onClick={() => setLang(lang === 'en' ? 'tr' : 'en')} className="text-[10px] bg-slate-800 border border-slate-700 px-1 rounded hover:bg-slate-700 transition-colors">{lang === 'en' ? 'TR' : 'EN'}</button>
                </div>
                <div className="text-right">
                    <span className="block text-slate-500 text-[10px] uppercase tracking-wider">{t.moves}</span>
                    <span className="text-white font-bold font-mono text-xl">{moves}</span>
                </div>
            </div>
            <div className="flex p-1 bg-slate-800/50 rounded-lg backdrop-blur-sm mb-2">
                {(['DAILY', 'PRACTICE'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === m ? (m==='DAILY'?'bg-cyan-700':'bg-fuchsia-700') + ' text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        {m === 'DAILY' ? t.modes.daily : t.modes.practice}
                    </button>
                ))}
            </div>
        </header>
    );
};
