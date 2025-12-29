import { GoogleGenAI, Type } from "@google/genai";
import { DailyTheme, GameState, Grid, NodeStatus, WinAnalysis } from "../types";
import { Language } from "../constants/translations";

const THEME_FALLBACK: DailyTheme = {
  name: "Classic Voltage",
  description: "Keep the current flowing steady.",
  colorHex: "#3b82f6" // blue-500
};

export const getDailyTheme = async (dateStr: string, lang: Language): Promise<DailyTheme> => {
  if (!process.env.API_KEY) return THEME_FALLBACK;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const langInstruction = lang === 'tr' ? "Output ONLY in Turkish." : "Output in English.";
    
    const prompt = `Create a fun, short 3-word tech/cyberpunk theme name, a one-sentence description, and a hex color code for a daily puzzle game. The vibe should be based on this date seed: ${dateStr}. ${langInstruction} Return JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            colorHex: { type: Type.STRING },
          },
          required: ["name", "description", "colorHex"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as DailyTheme;
    }
    return THEME_FALLBACK;
  } catch (e) {
    console.error("Gemini Theme Error", e);
    return THEME_FALLBACK;
  }
};

export const getWinningCommentary = async (moves: number, grid: Grid, lang: Language): Promise<WinAnalysis> => {
    if (!process.env.API_KEY) return { rank: "Offline Operator", comment: `System Optimized. Efficiency: ${moves} moves.` };

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Count specific tiles for context
        let bugsAvoided = 0;
        let bonusHit = 0;
        let totalTiles = 0;
        grid.flat().forEach(t => {
            if (t.status === NodeStatus.FORBIDDEN && !t.hasFlow) bugsAvoided++;
            if (t.status === NodeStatus.REQUIRED && t.hasFlow) bonusHit++;
            totalTiles++;
        });

        const langInstruction = lang === 'tr' 
            ? "Respond entirely in Turkish. Use cyberpunk/hacker terminology suitable for a Turkish audience." 
            : "Respond in English.";

        const prompt = `
            The player just solved today's logic puzzle "FlowState".
            
            Stats:
            - Moves: ${moves} (Context: < 20 is God-tier, 20-35 is Solid, > 35 is "Experimental").
            - Bugs Avoided: ${bugsAvoided}/2.
            - Bonus Nodes Powered: ${bonusHit}/3.
            
            Task:
            1. Assign a cool, cyberpunk/sysadmin/hacker "Rank" title based on their efficiency (e.g., "Mainframe Deity", "Script Kiddie", "Netrunner Prime").
            2. Write a witty, 1-sentence sarcastic or celebratory remark about their performance as if you are a sassy AI system administrator.
            
            ${langInstruction}
            Return JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        rank: { type: Type.STRING },
                        comment: { type: Type.STRING },
                    },
                    required: ["rank", "comment"],
                },
            },
        });

        if (response.text) {
            return JSON.parse(response.text) as WinAnalysis;
        }
        return { rank: "System Glitch", comment: "Analysis Complete." };
    } catch (e) {
        return { rank: "Local User", comment: "Sequence Validated." };
    }
}

export const getGameHint = async (grid: Grid, lang: Language): Promise<string> => {
    if (!process.env.API_KEY) return "Communications offline. Check manual alignment.";

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const simpleGrid = grid.map((row, r) => row.map((t, c) => ({
            pos: `${r},${c}`,
            type: t.type,
            rot: t.rotation,
            powered: t.hasFlow,
            isBug: t.status === NodeStatus.FORBIDDEN,
            isReq: t.status === NodeStatus.REQUIRED
        })));

        const langInstruction = lang === 'tr' 
            ? "Output ONLY in Turkish." 
            : "Output in English.";

        const prompt = `
            You are "Operator", a helpful but cryptic hacker AI assisting a player in a pipe-flow puzzle.
            OBJECTIVE: Connect Source (left) to Sink (right).
            
            Current Grid State (JSON):
            ${JSON.stringify(simpleGrid)}
            
            Task:
            Analyze where the flow STOPS.
            Identify ONE specific tile that needs rotation.
            
            Output:
            A single, short, immersive sentence.
            DO NOT give coordinates (e.g. "Rotate 3,4").
            DO say things like "The signal is dying near the center junction" or "Bypass the firewall in the upper quadrant".
            Keep it under 15 words.
            ${langInstruction}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });

        return response.text || "Signal unclear. Try adjusting the perimeter.";
    } catch (e) {
        return "Uplink failed. Trust your instincts.";
    }
}