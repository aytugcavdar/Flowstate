
import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Grid, NodeStatus, TileType } from '../types';
import { calculateFlow, checkWinCondition } from '../services/gameLogic';
import { generateDailyLevel } from '../services/levelGenerator';
import { playSound } from '../services/audio';
import { STORAGE_KEY_STATE } from '../constants';

export const useGameState = (gameKey: string) => {
    const [grid, setGrid] = useState<Grid>([]);
    const [moves, setMoves] = useState(0);
    const [isWon, setIsWon] = useState(false);
    const [charges, setCharges] = useState(0);
    const [loading, setLoading] = useState(true);
    const hasChargedRef = useRef(false);

    // Load or Init Game
    useEffect(() => {
        setLoading(true);
        const storageKey = `FLOWSTATE_${gameKey}_V4`;
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
            try {
                const state: GameState = JSON.parse(saved);
                if (state.gameDate === gameKey) {
                    setGrid(state.grid);
                    setMoves(state.moves);
                    setIsWon(state.isWon);
                    setCharges(state.charges);
                    hasChargedRef.current = state.charges > 0; // rough sync
                    setLoading(false);
                    return;
                }
            } catch (e) { console.error("Save load error", e); }
        }

        // New Game
        const newGrid = generateDailyLevel(gameKey);
        setGrid(newGrid);
        setMoves(0);
        setIsWon(false);
        setCharges(0);
        hasChargedRef.current = false;
        setLoading(false);

    }, [gameKey]);

    // Persistence
    useEffect(() => {
        if (!loading && grid.length > 0) {
            const storageKey = `FLOWSTATE_${gameKey}_V4`;
            const state: GameState = { grid, moves, isWon, gameDate: gameKey, charges };
            localStorage.setItem(storageKey, JSON.stringify(state));
        }
    }, [grid, moves, isWon, charges, loading, gameKey]);

    // Mechanics: Key/Lock & Capacitor Charging
    useEffect(() => {
        if (loading || isWon) return;
        if (moves === 0) hasChargedRef.current = false;

        let keyPowered = false;
        let capPowered = false;
        
        grid.flat().forEach(t => {
            if (t.status === NodeStatus.KEY && t.hasFlow) keyPowered = true;
            if (t.status === NodeStatus.CAPACITOR && t.hasFlow) capPowered = true;
        });

        // Unlock Logic
        const hasLockedNodes = grid.flat().some(t => t.status === NodeStatus.LOCKED && t.fixed);
        if (keyPowered && hasLockedNodes) {
            playSound('power'); 
            setGrid(prev => prev.map(row => row.map(t => {
                if (t.status === NodeStatus.LOCKED) return { ...t, fixed: false };
                return t;
            })));
        }

        // Charge Logic
        if (capPowered && charges === 0 && !hasChargedRef.current) {
            playSound('power');
            setCharges(1);
            hasChargedRef.current = true;
        }
    }, [grid, isWon, loading, charges, moves]);

    const onTileClick = useCallback((r: number, c: number) => {
        if (isWon || loading) return;
        const tile = grid[r][c];
        
        // Ability: Zap Bug
        if (tile.status === NodeStatus.FORBIDDEN && charges > 0) {
            playSound('power'); 
            const newGrid = grid.map(row => row.map(t => ({...t})));
            newGrid[r][c] = { ...newGrid[r][c], status: NodeStatus.NORMAL, fixed: false };
            setCharges(0);
            setGrid(calculateFlow(newGrid));
            return;
        }

        if (tile.fixed) {
            if (tile.status === NodeStatus.LOCKED) playSound('click');
            return;
        }

        playSound('rotate');
        const newGrid = grid.map(row => row.map(t => ({ ...t })));
        newGrid[r][c].rotation = (newGrid[r][c].rotation + 1) % 4;
        
        const flowedGrid = calculateFlow(newGrid);
        
        // Glitch Sound Check
        const hasNewGlitch = flowedGrid.flat().some((t, i) => 
            t.status === NodeStatus.FORBIDDEN && t.hasFlow && !grid.flat()[i].hasFlow
        );
        if (hasNewGlitch && navigator.vibrate) navigator.vibrate(50);
        if (hasNewGlitch) playSound('glitch');

        const prevPower = grid.flat().filter(t => t.hasFlow).length;
        const newPower = flowedGrid.flat().filter(t => t.hasFlow).length;
        if (newPower > prevPower && !hasNewGlitch) playSound('power');

        setGrid(flowedGrid);
        setMoves(m => m + 1);

        if (checkWinCondition(flowedGrid)) {
            setIsWon(true);
        }
    }, [grid, isWon, loading, charges]);

    const resetGame = () => {
        if (isWon) return;
        playSound('glitch');
        const resetGrid = generateDailyLevel(gameKey);
        setGrid(resetGrid);
        setMoves(0);
        setCharges(0);
        hasChargedRef.current = false;
    };

    return {
        grid,
        moves,
        isWon,
        charges,
        loading,
        onTileClick,
        resetGame,
        setGrid
    };
};
