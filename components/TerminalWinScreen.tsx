
import React, { useEffect, useState, useRef } from 'react';
import { TRANSLATIONS, Language } from '../constants/translations';
import { BADGES } from '../services/progression';
import { WinAnalysis, DailyMission } from '../types';
import { playSound } from '../services/audio';

interface TerminalWinScreenProps {
    moves: number;
    timeMs: number;
    unlockedBadges: string[];
    winAnalysis: WinAnalysis | null;
    lang: Language;
    onShare: () => void;
    onNext: () => void;
    onClose: () => void;
    mode: 'DAILY' | 'PRACTICE';
    xpGained: number;
    missions?: DailyMission[];
    completedMissionIds?: string[];
    streak?: number;
}

export const TerminalWinScreen: React.FC<TerminalWinScreenProps> = ({ 
    moves, timeMs, unlockedBadges, winAnalysis, lang, onShare, onNext, onClose, mode, xpGained, missions, completedMissionIds, streak 
}) => {
    const t = TRANSLATIONS[lang];
    const [lines, setLines] = useState<React.ReactNode[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [isComplete, setIsComplete] = useState(false);

    const addLine = (content: React.ReactNode) => {
        setLines(prev => [...prev, content]);
        playSound('click');
        if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const sequence = async () => {
            const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

            await wait(500);
            addLine(<div className="text-xs text-slate-500 border-b border-slate-700 pb-1 mb-2">--- {t.terminal.header} ---</div>);
            
            await wait(300);
            addLine(<div className="text-green-500 font-bold">{`> ${t.terminal.upload}... OK`}</div>);
            
            await wait(400);
            addLine(
                <div className="flex justify-between w-full max-w-xs text-sm">
                    <span className="text-slate-400">{t.terminal.analysis}:</span>
                    <span className="text-cyan-400 font-mono">{moves} MOVES</span>
                </div>
            );

            await wait(200);
            addLine(
                <div className="flex justify-between w-full max-w-xs text-sm">
                    <span className="text-slate-400">{t.terminal.time}:</span>
                    <span className="text-cyan-400 font-mono">{(timeMs / 1000).toFixed(2)}s</span>
                </div>
            );

            // Mission Report
            if (missions && completedMissionIds && missions.length > 0) {
                await wait(500);
                addLine(<div className="mt-2 text-slate-500 text-[10px]">--- {t.terminal.missions} ---</div>);
                
                for (const m of missions) {
                    const isDone = completedMissionIds.includes(m.id);
                    await wait(200);
                    addLine(
                         <div className={`flex justify-between items-center w-full max-w-xs text-xs py-0.5 ${isDone ? 'text-green-400' : 'text-slate-600'}`}>
                            <span className="flex items-center gap-2">
                                <span>{isDone ? '[x]' : '[ ]'}</span>
                                <span>{t.missions[m.description as keyof typeof t.missions].replace('{target}', m.target.toString())}</span>
                            </span>
                            {isDone && <span className="font-mono text-yellow-500">+{m.xpReward}XP</span>}
                        </div>
                    );
                }
            }

            await wait(500);
            // XP GAIN
            const streakBonus = (streak && streak > 1) ? ` (x${(1 + Math.min(streak, 10)*0.1).toFixed(1)})` : '';
             addLine(
                <div className="flex justify-between w-full max-w-xs text-sm border-t border-slate-800 pt-2 mt-2">
                    <span className="text-slate-400">{t.terminal.xp}:</span>
                    <span className="text-yellow-400 font-bold font-mono animate-pulse">+{xpGained} XP{streakBonus}</span>
                </div>
            );

            if (unlockedBadges.length > 0) {
                await wait(800);
                unlockedBadges.forEach(bid => {
                    const badgeInfo = t.badges[bid as keyof typeof t.badges];
                    const baseBadge = BADGES[bid];
                    if (badgeInfo && baseBadge) {
                        addLine(
                            <div className="my-2 p-2 bg-yellow-900/20 border border-yellow-600/50 rounded flex items-center gap-3 animate-pulse">
                                <span className="text-2xl">{baseBadge.icon}</span>
                                <div>
                                    <div className="text-[10px] text-yellow-500 uppercase tracking-widest">{t.terminal.badge}</div>
                                    <div className="text-yellow-300 font-bold">{badgeInfo.name}</div>
                                </div>
                            </div>
                        );
                    }
                });
            }

            if (winAnalysis) {
                await wait(1000);
                addLine(<div className="mt-2 text-slate-500 text-[10px]">--- {t.terminal.rank} ---</div>);
                addLine(<div className="text-lg font-black text-fuchsia-500 tracking-wider typing-effect">{winAnalysis.rank}</div>);
                await wait(500);
                addLine(<div className="text-xs text-slate-400 italic">"{winAnalysis.comment}"</div>);
            }

            await wait(1000);
            setIsComplete(true);
        };

        sequence();
        return () => clearTimeout(timer);
    }, [moves, timeMs, unlockedBadges, winAnalysis, xpGained, missions, completedMissionIds]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <div className="bg-black border border-green-900/50 w-full max-w-md h-[550px] flex flex-col font-mono rounded-md shadow-2xl relative overflow-hidden">
                {/* CRT Scanline Overlay */}
                <div className="absolute inset-0 scanlines opacity-20 pointer-events-none"></div>
                <div className="absolute inset-0 bg-green-500/5 pointer-events-none"></div>
                
                {/* Scrollable Content */}
                <div className="flex-1 p-6 overflow-y-auto space-y-1 scrollbar-hide">
                    {lines.map((line, i) => <div key={i} className="animate-in fade-in duration-300">{line}</div>)}
                    <div ref={bottomRef}></div>
                </div>

                {/* Footer Buttons */}
                {isComplete && (
                    <div className="p-4 border-t border-green-900/50 bg-slate-900/50 flex flex-col gap-2 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex gap-2 w-full">
                            <button onClick={onShare} className="flex-1 py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded flex items-center justify-center gap-2 group shadow-lg shadow-green-900/50">
                                <span>{t.buttons.share}</span>
                            </button>
                            {mode === 'PRACTICE' && (
                                <button onClick={onNext} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded border border-slate-600">
                                    {t.buttons.next}
                                </button>
                            )}
                        </div>
                        <button onClick={onClose} className="w-full py-2 bg-transparent hover:bg-slate-800 text-slate-500 hover:text-slate-300 text-xs font-bold rounded border border-transparent hover:border-slate-700 transition-colors">
                            {t.buttons.close}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
