
import React, { useState, useEffect, useRef } from 'react';
import { TileType, TileState, NodeStatus } from '../types';
import { FLOW_COLOR } from '../constants';
import { SparkBurst } from './SparkBurst';

interface TileProps {
  tile: TileState;
  onClick: () => void;
  isWon: boolean;
}

export const Tile: React.FC<TileProps> = ({ tile, onClick, isWon }) => {
  const { type, rotation, hasFlow, flowColor, flowDelay, status, fixed } = tile;
  
  const [showSparks, setShowSparks] = useState(false);
  const prevFlowRef = useRef(hasFlow);

  useEffect(() => {
    if (hasFlow && !prevFlowRef.current) {
        const timer = setTimeout(() => {
            setShowSparks(true);
            setTimeout(() => setShowSparks(false), 1000); 
        }, flowDelay);
        return () => clearTimeout(timer);
    }
    prevFlowRef.current = hasFlow;
  }, [hasFlow, flowDelay]);

  // --- Visual Logic ---
  const isBugged = status === NodeStatus.FORBIDDEN && hasFlow;
  const isLocked = status === NodeStatus.LOCKED;
  const isKey = status === NodeStatus.KEY;
  const isCapacitor = status === NodeStatus.CAPACITOR;
  
  // Color Logic
  let fgColor = 'text-slate-600'; 
  
  if (hasFlow) {
      if (isBugged) {
          fgColor = 'text-red-500';
      } else if (isWon) {
          fgColor = 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]';
      } else {
          switch (flowColor) {
              case FLOW_COLOR.CYAN: fgColor = 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]'; break;
              case FLOW_COLOR.MAGENTA: fgColor = 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)]'; break;
              case FLOW_COLOR.WHITE: fgColor = 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]'; break;
              default: fgColor = 'text-yellow-400';
          }
      }
  }

  const animationClass = hasFlow ? (isBugged ? 'animate-glitch' : 'animate-flow') : '';
  
  // Background Colors
  let bgColor = (fixed && !isLocked) ? 'bg-slate-900' : (isLocked ? 'bg-slate-900/80 pattern-grid-lg' : 'bg-slate-800 hover:bg-slate-750');
  let borderClass = isBugged ? 'border-red-500' : (isLocked ? 'border-slate-600' : 'border-slate-700/50');

  // Special style for BLOCK
  if (type === TileType.BLOCK) {
      bgColor = 'bg-slate-950 pattern-diagonal-lines-sm';
      borderClass = 'border-slate-800';
  }

  // --- Status Icons ---
  let statusIcon = null;
  if (status === NodeStatus.REQUIRED) {
    statusIcon = (
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10`}>
         <span className={`text-[10px] font-bold ${hasFlow ? 'text-green-400' : 'text-slate-500'}`}>⚡</span>
      </div>
    );
  } else if (status === NodeStatus.FORBIDDEN) {
    statusIcon = (
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 ${isBugged ? 'glitch-intense' : ''}`}>
        <span className={`text-[8px] font-bold ${hasFlow ? 'text-red-500 font-black tracking-widest' : 'text-red-900'}`}>BUG</span>
      </div>
    );
  } else if (isKey) {
     statusIcon = (
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10`}>
         <span className={`text-lg ${hasFlow ? 'text-yellow-400 animate-pulse' : 'text-yellow-900'}`}>🔑</span>
      </div>
    );
  } else if (isLocked) {
     statusIcon = (
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10`}>
         <span className={`text-xl ${fixed ? 'text-slate-500' : 'text-green-500 animate-ping opacity-0'}`}>
            {fixed ? '🔒' : '🔓'}
         </span>
      </div>
    );
  } else if (isCapacitor) {
      statusIcon = (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10`}>
           <span className={`text-lg ${hasFlow ? 'text-blue-400 animate-bounce' : 'text-blue-900'}`}>🔋</span>
        </div>
      );
  }

  const handleClick = () => {
      if (type === TileType.BLOCK) return; // Cannot rotate walls
      if (isLocked && fixed) {
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
          return;
      }
      if (fixed) return;
      if (navigator.vibrate) navigator.vibrate(5);
      onClick();
  };

  const renderPipe = () => {
    const renderPath = (d: string) => (
        <>
            <path d={d} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
            {hasFlow && !isBugged && (
                <path d={d} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="animate-dash opacity-70" />
            )}
        </>
    );

    switch (type) {
      case TileType.STRAIGHT: return renderPath("M 30 0 L 30 60");
      case TileType.ELBOW: return renderPath("M 30 0 L 30 30 L 60 30");
      case TileType.TEE: return renderPath("M 30 0 L 30 60 M 30 30 L 60 30");
      case TileType.CROSS: return renderPath("M 30 0 L 30 60 M 0 30 L 60 30");
      case TileType.BRIDGE: 
        return (
            <g>
                {/* Horizontal Under */}
                <path d="M 0 30 L 60 30" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.6"/>
                {/* Vertical Over (Bridge Effect) */}
                <path d="M 30 0 L 30 60" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
                {/* Bridge Shadows/Details */}
                <path d="M 24 0 L 24 60" fill="none" stroke="black" strokeWidth="1" opacity="0.5" />
                <path d="M 36 0 L 36 60" fill="none" stroke="black" strokeWidth="1" opacity="0.5" />
                {hasFlow && !isBugged && <circle cx="30" cy="30" r="4" fill="white" className="animate-pulse" />}
            </g>
        );
      case TileType.SOURCE:
        return (
            <g>
                <circle cx="30" cy="30" r="15" fill="currentColor" />
                <rect x="30" y="25" width="30" height="10" fill="currentColor" />
                {/* Source doesn't animate flow logic same way, but let's add glow */}
                <circle cx="30" cy="30" r="10" fill="white" className="opacity-20" />
            </g>
        );
      case TileType.SINK:
        return (
            <g>
                <rect x="0" y="25" width="30" height="10" fill="currentColor" />
                <rect x="15" y="15" width="30" height="30" rx="4" stroke="currentColor" strokeWidth="4" fill="none"/>
                {/* Inner White Requirement Indicator */}
                <circle cx="30" cy="30" r="8" fill={hasFlow && flowColor === FLOW_COLOR.WHITE ? "white" : "#333"} />
            </g>
        );
      case TileType.DIODE:
         return (
             <g>
                <rect x="25" y="0" width="10" height="60" rx="4" fill="currentColor"/>
                <path d="M 20 40 L 30 20 L 40 40 Z" fill="currentColor" stroke="none" />
             </g>
         );
      case TileType.BLOCK:
         // Render a visual "Wall" or "Server Rack"
         return (
             <g opacity="0.3">
                <rect x="10" y="10" width="40" height="40" rx="4" fill="currentColor" />
                <line x1="10" y1="10" x2="50" y2="50" stroke="#000" strokeWidth="2" />
                <line x1="50" y1="10" x2="10" y2="50" stroke="#000" strokeWidth="2" />
             </g>
         );
      default: return null;
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`relative w-full h-full aspect-square ${bgColor} rounded-md transition-all duration-200 cursor-pointer overflow-hidden border ${borderClass}`}
    >
      {showSparks && <SparkBurst />}
      {statusIcon}
      
      <div 
        className={`w-full h-full transition-transform duration-300 ease-out`}
        style={{ transform: `rotate(${rotation * 90}deg)` }}
      >
        <div 
            className={`w-full h-full transition-colors duration-200 ease-linear ${fgColor} ${animationClass}`}
            style={{ transitionDelay: hasFlow ? `${flowDelay}ms` : '0ms' }}
        >
            <svg viewBox="0 0 60 60" className="w-full h-full p-1.5 sm:p-2">
                {renderPipe()}
            </svg>
        </div>
      </div>
    </div>
  );
};
