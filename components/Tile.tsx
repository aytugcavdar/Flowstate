
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TileType, TileState, NodeStatus } from '../types';
import { FLOW_COLOR } from '../constants';
import { SparkBurst } from './SparkBurst';

interface TileProps {
  tile: TileState;
  onClick: () => void;
  isWon: boolean;
  charges: number;
  row: number; // Needed to determine source color hint
}

// --- Render Helpers ---
const PIPE_WIDTH = 10;
const FLOW_WIDTH = 3;
const HUB_RADIUS = 7;

const Paths = {
    STRAIGHT: "M 30 0 L 30 60",
    ELBOW: "M 30 0 L 30 30 L 60 30",
    TEE: "M 30 0 L 30 60 M 30 30 L 60 30",
    CROSS: "M 30 0 L 30 60 M 0 30 L 60 30",
    DIODE: "M 30 0 L 30 60"
};

const RenderSVG: React.FC<{ type: TileType, rotation: number, hasFlow: boolean, isBugged: boolean, flowColor: number, row: number }> = React.memo(({ type, rotation, hasFlow, isBugged, flowColor, row }) => {
    
    const renderPath = (d: string) => (
        <>
            <path d={d} fill="none" stroke="currentColor" strokeWidth={PIPE_WIDTH} strokeLinecap="butt" />
            <circle cx="30" cy="30" r={HUB_RADIUS} fill="currentColor" />
            {hasFlow && !isBugged && (
                <path d={d} fill="none" stroke="white" strokeWidth={FLOW_WIDTH} strokeLinecap="round" className="animate-dash opacity-80" />
            )}
        </>
    );

    switch (type) {
        case TileType.STRAIGHT: return renderPath(Paths.STRAIGHT);
        case TileType.ELBOW: return renderPath(Paths.ELBOW);
        case TileType.TEE: return renderPath(Paths.TEE);
        case TileType.CROSS: return renderPath(Paths.CROSS);
        case TileType.BRIDGE: 
            return (
                <g>
                    <path d="M 0 30 L 60 30" fill="none" stroke="currentColor" strokeWidth={PIPE_WIDTH} strokeLinecap="butt" className="opacity-40"/>
                    <path d="M 30 0 L 30 60" fill="none" stroke="#0f172a" strokeWidth={PIPE_WIDTH + 4} strokeLinecap="butt" />
                    <path d="M 30 0 L 30 60" fill="none" stroke="currentColor" strokeWidth={PIPE_WIDTH} strokeLinecap="butt" />
                    {hasFlow && !isBugged && (
                        <>
                            {rotation % 2 !== 0 && <path d="M 0 30 L 60 30" fill="none" stroke="white" strokeWidth={FLOW_WIDTH} strokeLinecap="round" className="animate-dash opacity-40" />}
                            {rotation % 2 === 0 && <path d="M 30 0 L 30 60" fill="none" stroke="white" strokeWidth={FLOW_WIDTH} strokeLinecap="round" className="animate-dash opacity-90" />}
                        </>
                    )}
                </g>
            );
        case TileType.SOURCE:
            // Visual Hint: Top Sources are Cyan, Bottom are Magenta
            // If hasFlow is true, the outer logic handles the glow, but we want the core to show identity
            const hintColor = row < 4 ? "#22d3ee" : "#e879f9";
            
            return (
                <g>
                    <circle cx="30" cy="30" r="14" fill="currentColor" />
                    <rect x="30" y="25" width="30" height="10" fill="currentColor" />
                    {/* Inner core showing identity */}
                    <circle cx="30" cy="30" r="8" fill={hintColor} className={hasFlow ? "" : "opacity-60"} />
                    {hasFlow && <circle cx="30" cy="30" r="4" fill="white" className="animate-pulse" />}
                </g>
            );
        case TileType.SINK:
            return (
                <g>
                    <rect x="0" y="25" width="30" height="10" fill="currentColor" />
                    <rect x="15" y="15" width="30" height="30" rx="4" stroke="currentColor" strokeWidth="4" fill="none"/>
                    {/* Sink Hole */}
                    <circle cx="30" cy="30" r="8" fill={hasFlow && flowColor === 3 ? "white" : "#0f172a"} stroke="currentColor" strokeWidth="2" />
                    {/* Indicators */}
                    <circle cx="22" cy="22" r="2" fill="#22d3ee" className="opacity-50" />
                    <circle cx="38" cy="38" r="2" fill="#e879f9" className="opacity-50" />
                </g>
            );
        case TileType.DIODE:
            return (
                <g>
                    {renderPath(Paths.DIODE)}
                    <path d="M 22 42 L 30 25 L 38 42 Z" fill="#0f172a" stroke="currentColor" strokeWidth="2" />
                </g>
            );
        case TileType.BLOCK:
            return (
                <g opacity="0.4">
                    <rect x="12" y="12" width="36" height="36" rx="2" fill="currentColor" />
                    <path d="M 12 12 L 48 48 M 48 12 L 12 48" stroke="#000" strokeWidth="2" />
                </g>
            );
        default: return null;
    }
});

export const Tile: React.FC<TileProps> = ({ tile, onClick, isWon, charges, row }) => {
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

  // Derived State
  const isBugged = status === NodeStatus.FORBIDDEN && hasFlow;
  const isTargetableBug = status === NodeStatus.FORBIDDEN && charges > 0;
  const isLocked = status === NodeStatus.LOCKED;
  const isKey = status === NodeStatus.KEY;
  const isCapacitor = status === NodeStatus.CAPACITOR;

  // --- Styles ---
  const fgColor = useMemo(() => {
      if (!hasFlow) return 'text-slate-600';
      if (isBugged) return 'text-red-500';
      if (isWon) return 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]';
      switch (flowColor) {
          case FLOW_COLOR.CYAN: return 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]';
          case FLOW_COLOR.MAGENTA: return 'text-fuchsia-400 drop-shadow-[0_0_5px_rgba(232,121,249,0.8)]';
          case FLOW_COLOR.WHITE: return 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,1)]';
          default: return 'text-yellow-400';
      }
  }, [hasFlow, isBugged, isWon, flowColor]);

  const bgClass = useMemo(() => {
    if (type === TileType.BLOCK) return 'bg-slate-950 border-slate-800';
    if (isTargetableBug) return 'bg-slate-900 cursor-crosshair border-blue-400 animate-pulse border-2 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
    if (isBugged) return 'border-red-500 bg-slate-800';
    if (isLocked) return 'bg-slate-900/80 pattern-grid-lg border-slate-600';
    if (fixed) return 'bg-slate-900 border-slate-700/50';
    return 'bg-slate-800 hover:bg-slate-750 border-slate-700/50';
  }, [type, isTargetableBug, isBugged, isLocked, fixed]);

  const animationClass = hasFlow ? (isBugged ? 'animate-glitch' : 'animate-flow') : '';

  const handleClick = () => {
      if (type === TileType.BLOCK) return; 
      if (isLocked && fixed) {
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
          return;
      }
      if (fixed && !isTargetableBug) return;
      if (navigator.vibrate) navigator.vibrate(5);
      onClick();
  };

  return (
    <div 
      onClick={handleClick}
      className={`relative w-full h-full aspect-square rounded-sm sm:rounded-md transition-all duration-200 cursor-pointer overflow-hidden border ${bgClass}`}
    >
      {showSparks && <SparkBurst />}
      
      {/* Icons Overlay */}
      {status === NodeStatus.REQUIRED && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
           <span className={`text-[10px] font-bold ${hasFlow ? 'text-green-400' : 'text-slate-500'} bg-slate-900/50 rounded-full w-4 h-4 flex items-center justify-center`}>⚡</span>
        </div>
      )}
      {status === NodeStatus.FORBIDDEN && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 ${isBugged ? 'glitch-intense' : ''}`}>
          <span className={`text-[8px] font-bold ${hasFlow ? 'text-red-500 font-black tracking-widest' : (isTargetableBug ? 'text-blue-400 animate-bounce' : 'text-red-900')}`}>
              {isTargetableBug ? "TARGET" : "BUG"}
          </span>
        </div>
      )}
      {isKey && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className={`text-lg ${hasFlow ? 'text-yellow-400 animate-pulse' : 'text-yellow-900'}`}>🔑</span>
         </div>
      )}
      {isLocked && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className={`text-xl ${fixed ? 'text-slate-500' : 'text-green-500 animate-ping opacity-0'}`}>{fixed ? '🔒' : '🔓'}</span>
         </div>
      )}
      {isCapacitor && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className={`text-lg ${hasFlow ? 'text-blue-400 animate-bounce' : 'text-blue-900'}`}>🔋</span>
         </div>
      )}
      
      <div 
        className={`w-full h-full transition-transform duration-300 ease-out`}
        style={{ transform: `rotate(${rotation * 90}deg)` }}
      >
        <div 
            className={`w-full h-full transition-colors duration-200 ease-linear ${fgColor} ${animationClass}`}
            style={{ transitionDelay: hasFlow ? `${flowDelay}ms` : '0ms' }}
        >
            <svg viewBox="0 0 60 60" className="w-full h-full p-0.5 sm:p-1">
                <RenderSVG type={type} rotation={rotation} hasFlow={hasFlow} isBugged={isBugged} flowColor={flowColor} row={row} />
            </svg>
        </div>
      </div>
    </div>
  );
};
