
import React from 'react';
import { DailyMission, DailyStats } from '../types';
import { Language, TRANSLATIONS } from '../constants/translations';

interface MissionBoardProps {
    missions: DailyMission[];
    stats: DailyStats;
    lang: Language;
}

export const MissionBoard: React.FC<MissionBoardProps> = ({ missions, stats, lang }) => {
    const t = TRANSLATIONS[lang];

    return (
        <div className="bg-slate-950 border border-slate-800 rounded p-3 my-2 font-mono">
             <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-1">
                 <h3 className="text-xs text-cyan-400 font-bold tracking-widest">{t.intro.todaysOrders}</h3>
                 <div className="text-[10px] text-yellow-500">
                    {t.intro.streakBonus}: <span className="font-bold">x{(1 + Math.min(stats.streak, 10) * 0.1).toFixed(1)}</span>
                 </div>
             </div>
             <div className="space-y-2">
                 {missions.map(mission => {
                     const isComplete = stats.completedMissions?.includes(mission.id);
                     const desc = t.missions[mission.description as keyof typeof t.missions].replace('{target}', mission.target.toString());
                     
                     return (
                         <div key={mission.id} className={`flex items-center justify-between text-xs p-1.5 rounded ${isComplete ? 'bg-green-900/20 text-green-500' : 'bg-slate-900 text-slate-400'}`}>
                             <div className="flex items-center gap-2">
                                 <div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${isComplete ? 'border-green-500 bg-green-500/20' : 'border-slate-600'}`}>
                                     {isComplete && '✓'}
                                 </div>
                                 <span className={isComplete ? 'line-through opacity-70' : ''}>{desc}</span>
                             </div>
                             <div className="text-yellow-600 text-[10px] font-bold">
                                 {mission.xpReward} XP
                             </div>
                         </div>
                     )
                 })}
             </div>
        </div>
    );
}
