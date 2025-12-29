import React from 'react';
import { TileType, TileState, NodeStatus } from '../types';

interface TileProps {
  tile: TileState;
  onClick: () => void;
  isWon: boolean;
}

export const Tile: React.FC<TileProps> = ({ tile, onClick, isWon }) => {
  const { type, rotation, hasFlow, status, fixed } = tile;

  // --- Cyberpunk Visual Logic ---
  const isBugged = status === NodeStatus.FORBIDDEN && hasFlow;
  
  let fgColor = 'text-slate-600'; 
  let animationClass = '';
  let containerEffect = '';

  if (isBugged) {
    fgColor = 'text-red-500';
    animationClass = 'animate-glitch'; 
    containerEffect = 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
  } else if (hasFlow) {
    if (isWon) {
      fgColor = 'text-cyan-300';
      animationClass = 'animate-flow duration-700';
    } else {
      fgColor = 'text-yellow-300';
      animationClass = 'animate-flow';
    }
  }

  const bgColor = fixed ? 'bg-slate-900' : 'bg-slate-800 hover:bg-slate-750';
  const borderClass = isBugged ? '' : 'border-slate-700/50';

  let statusIcon = null;
  if (status === NodeStatus.REQUIRED) {
    statusIcon = (
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10`}>
         <span className={`text-xs font-bold ${hasFlow ? (isWon ? 'text-white drop-shadow-md' : 'text-green-400') : 'text-slate-500'}`}>⚡</span>
      </div>
    );
  } else if (status === NodeStatus.FORBIDDEN) {
    statusIcon = (
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10`}>
        <span className={`text-xs font-bold ${hasFlow ? 'text-red-500 font-black tracking-widest' : 'text-red-900'}`}>BUG</span>
      </div>
    );
  }

  // Handle Haptics on Click
  const handleClick = () => {
      if (fixed) return;
      if (navigator.vibrate) navigator.vibrate(5); // Short tick
      onClick();
  };

  const renderPipe = () => {
    switch (type) {
      case TileType.STRAIGHT:
        return <rect x="25" y="0" width="10" height="60" rx="4" />;
      case TileType.ELBOW:
        return <path d="M 30 0 L 30 30 L 60 30" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />;
      case TileType.TEE:
        return <path d="M 30 0 L 30 60 M 30 30 L 60 30" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />;
      case TileType.CROSS:
         return <path d="M 30 0 L 30 60 M 0 30 L 60 30" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />;
      case TileType.DIODE:
         // Straight pipe with a Triangle Arrow in center
         return (
             <g>
                <rect x="25" y="0" width="10" height="60" rx="4" />
                <path d="M 20 40 L 30 20 L 40 40 Z" fill="currentColor" stroke="none" />
             </g>
         );
      case TileType.SOURCE:
        return (
            <g>
                <circle cx="30" cy="30" r="15" fill="currentColor" />
                <rect x="30" y="25" width="30" height="10" fill="currentColor" />
            </g>
        );
      case TileType.SINK:
        return (
            <g>
                <rect x="0" y="25" width="30" height="10" fill="currentColor" />
                <rect x="15" y="15" width="30" height="30" rx="4" stroke="currentColor" strokeWidth="4" fill="none"/>
            </g>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      onClick={!fixed ? handleClick : undefined}
      className={`relative w-full h-full aspect-square ${bgColor} rounded-md transition-all duration-200 cursor-pointer overflow-hidden border ${borderClass} ${containerEffect}`}
    >
      {statusIcon}
      <div 
        className={`w-full h-full transition-transform duration-300 ease-out`}
        style={{ transform: `rotate(${rotation * 90}deg)` }}
      >
        <div className={`w-full h-full ${fgColor} ${animationClass}`}>
            <svg viewBox="0 0 60 60" className="w-full h-full p-2">
                {renderPipe()}
            </svg>
        </div>
      </div>
      {!fixed && (
          <div className="absolute top-1 right-1 w-1 h-1 bg-slate-500/30 rounded-full" />
      )}
    </div>
  );
};