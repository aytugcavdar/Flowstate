
import React from 'react';
import { Modal } from './Modal';
import { PlayerProfile } from '../types';
import { BADGES, getTitleForLevel } from '../services/progression';
import { TRANSLATIONS, Language } from '../constants/translations';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: PlayerProfile;
    lang: Language;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, profile, lang }) => {
    const t = TRANSLATIONS[lang];
    
    // XP Calculations
    const currentLevel = profile.level;
    const currentXP = profile.xp;
    const xpPerLevel = 1000;
    const nextLevelXP = currentLevel * xpPerLevel; // Simple linear for now, or just mod based
    const progressXP = currentXP % xpPerLevel;
    const percentage = (progressXP / xpPerLevel) * 100;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t.profile.title}>
            <div className="space-y-6 font-mono">
                
                {/* Level / XP Section */}
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-lg">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest">{t.profile.level} {currentLevel}</div>
                            <div className="text-xl text-yellow-400 font-black tracking-tighter">
                                {getTitleForLevel(currentLevel)}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-slate-400">{progressXP} / {xpPerLevel} XP</div>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700 relative">
                         <div 
                            className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000 ease-out"
                            style={{ width: `${percentage}%` }}
                         ></div>
                         {/* Grid pattern over bar */}
                         <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjwqgOxVEwMTAy4AExdDABtQw8B04e7wAAAAABJRU5ErkJggg==')] opacity-30"></div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                        <div className="text-[10px] text-slate-500 uppercase">{t.profile.wins}</div>
                        <div className="text-2xl text-cyan-400 font-bold">{profile.totalWins}</div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                        <div className="text-[10px] text-slate-500 uppercase">{t.profile.streak}</div>
                        <div className="text-2xl text-fuchsia-400 font-bold">{profile.consecutiveNoHintWins}</div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                         <div className="text-[10px] text-slate-500 uppercase">{t.profile.xp}</div>
                         <div className="text-xl text-white font-bold">{profile.xp}</div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                        <div className="text-[10px] text-slate-500 uppercase">{t.profile.fastest}</div>
                        <div className="text-xl text-green-400 font-bold">
                            {profile.fastestWinMs === Infinity ? '--' : `${(profile.fastestWinMs / 1000).toFixed(1)}s`}
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div>
                    <h3 className="text-sm font-bold text-slate-400 mb-3 border-b border-slate-800 pb-1">BADGES_COLLECTED ({profile.badges.length}/{Object.keys(BADGES).length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {Object.values(BADGES).map(badge => {
                            const isUnlocked = profile.badges.includes(badge.id);
                            const badgeTxt = t.badges[badge.id as keyof typeof t.badges];

                            return (
                                <div key={badge.id} className={`flex items-center gap-3 p-2 rounded border ${isUnlocked ? 'bg-slate-800 border-cyan-900/50' : 'bg-slate-900/50 border-slate-800 opacity-50 grayscale'}`}>
                                    <div className="text-2xl">{badge.icon}</div>
                                    <div>
                                        <div className={`text-xs font-bold ${isUnlocked ? 'text-cyan-300' : 'text-slate-500'}`}>{badgeTxt?.name}</div>
                                        <div className="text-[8px] text-slate-500 leading-tight">{badgeTxt?.desc}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
