
import React, { useState } from 'react';
import { CAMPAIGN_CHAPTERS, calculateTotalStars } from '../services/campaign';
import { CampaignProgress, CampaignLevel } from '../types';
import { Language, TRANSLATIONS } from '../constants/translations';
import { playSound } from '../services/audio';

interface CampaignMenuProps {
    progress: CampaignProgress;
    onSelectLevel: (level: CampaignLevel) => void;
    lang: Language;
    onBack: () => void;
}

export const CampaignMenu: React.FC<CampaignMenuProps> = ({ progress, onSelectLevel, lang, onBack }) => {
    const t = TRANSLATIONS[lang];
    const totalStars = calculateTotalStars(progress);
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

    // If a chapter is selected, show its levels
    if (selectedChapterId) {
        const chapter = CAMPAIGN_CHAPTERS.find(c => c.id === selectedChapterId)!;
        return (
            <div className="w-full max-w-lg p-4 animate-in fade-in slide-in-from-right-4">
                <button onClick={() => setSelectedChapterId(null)} className="mb-4 text-xs text-cyan-400 hover:text-white flex items-center gap-2">
                    <span>←</span> {t.campaign.chapter} SELECT
                </button>
                
                <h2 className="text-2xl font-black text-white mb-2">{chapter.title}</h2>
                <p className="text-sm text-slate-400 mb-6">{chapter.description}</p>
                
                <div className="grid grid-cols-4 gap-3">
                    {chapter.levels.map((level, idx) => {
                        const stars = progress.levelStars[level.id] || 0;
                        const isLocked = idx > 0 && !progress.levelStars[chapter.levels[idx-1].id]; // Simple lock: must beat prev level
                        
                        // First level of unlocked chapter is always open
                        const isOpen = !isLocked; 

                        return (
                            <button 
                                key={level.id}
                                disabled={!isOpen}
                                onClick={() => { playSound('click'); onSelectLevel(level); }}
                                className={`aspect-square rounded-lg border flex flex-col items-center justify-center relative group
                                    ${isOpen 
                                        ? 'bg-slate-800 border-slate-600 hover:border-cyan-400 hover:bg-slate-700' 
                                        : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                                    }
                                `}
                            >
                                <div className="text-lg font-bold font-mono text-slate-200">{idx + 1}</div>
                                {stars > 0 && (
                                    <div className="flex gap-0.5 mt-1">
                                        {[1,2,3].map(s => (
                                            <span key={s} className={`text-[8px] ${s <= stars ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
                                        ))}
                                    </div>
                                )}
                                {!isOpen && <div className="absolute inset-0 flex items-center justify-center bg-black/50">🔒</div>}
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Chapter List
    return (
        <div className="w-full max-w-lg p-4 flex flex-col gap-4 animate-in fade-in">
             <div className="flex justify-between items-center mb-2">
                 <h2 className="text-xl font-bold text-white tracking-widest">{t.campaign.title}</h2>
                 <div className="text-yellow-500 font-bold text-sm">★ {totalStars}</div>
             </div>

             <div className="space-y-3">
                 {CAMPAIGN_CHAPTERS.map(chapter => {
                     const isUnlocked = progress.unlockedChapters.includes(chapter.id);
                     const chapterStars = chapter.levels.reduce((acc, lvl) => acc + (progress.levelStars[lvl.id] || 0), 0);
                     const maxStars = chapter.levels.length * 3;

                     return (
                         <button 
                            key={chapter.id}
                            disabled={!isUnlocked}
                            onClick={() => { playSound('click'); setSelectedChapterId(chapter.id); }}
                            className={`w-full text-left p-4 rounded-lg border relative overflow-hidden transition-all
                                ${isUnlocked 
                                    ? 'bg-slate-800 border-slate-600 hover:border-cyan-500 group' 
                                    : 'bg-slate-900/50 border-slate-800 opacity-60'
                                }
                            `}
                         >
                            {isUnlocked ? (
                                <>
                                    <div className="flex justify-between items-start z-10 relative">
                                        <div>
                                            <div className="text-[10px] text-cyan-500 font-bold tracking-widest mb-1">{t.campaign.chapter} {chapter.id.replace('ch', '')}</div>
                                            <div className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{chapter.title}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-yellow-500 font-mono">{chapterStars}/{maxStars} ★</div>
                                        </div>
                                    </div>
                                    <div className="mt-2 w-full h-1 bg-slate-700 rounded-full overflow-hidden z-10 relative">
                                        <div className="h-full bg-cyan-500" style={{ width: `${(chapterStars/maxStars)*100}%` }}></div>
                                    </div>
                                    {/* Bg Decoration */}
                                    <div className="absolute right-0 bottom-0 text-slate-700/20 text-6xl font-black -mr-4 -mb-2 pointer-events-none">
                                        {chapter.id.replace('ch', '0')}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-between text-slate-500">
                                    <div className="font-mono">{t.campaign.locked} <span className="text-yellow-600">{chapter.requiredStars} ★</span></div>
                                    <div className="text-2xl">🔒</div>
                                </div>
                            )}
                         </button>
                     )
                 })}
             </div>
             
             <button onClick={onBack} className="mt-4 py-3 text-sm text-slate-500 hover:text-white border border-transparent hover:border-slate-700 rounded transition-all">
                 {t.buttons.back}
             </button>
        </div>
    );
}
