
// Advanced Web Audio API Synthesizer
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

// Ambience State
let droneNodes: { osc1: OscillatorNode, osc2: OscillatorNode, gain: GainNode, filter: BiquadFilterNode } | null = null;
let pulseTimer: number | null = null;
let isInitialized = false;
let currentIntensity = 0; // 0.0 to 1.0

export const initAudio = () => {
  if (isInitialized && audioCtx) return;

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  audioCtx = new AudioContextClass();
  
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.3; // Master volume slightly lower to prevent clipping with multiple oscs
  masterGain.connect(audioCtx.destination);

  isInitialized = true;
};

// --- Drone Engine (The Atmosphere) ---
const createDrone = () => {
    if (!audioCtx || !masterGain || droneNodes) return;

    const t = audioCtx.currentTime;

    // We use two oscillators slightly detuned to create a thick "chorus" effect
    // reminiscent of analog sci-fi synths.
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    // Oscillator 1: The Root Note (Low A - 55Hz)
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55;

    // Oscillator 2: Slightly Detuned (55.5Hz) creates a slow "beating" texture
    osc2.type = 'sawtooth';
    osc2.frequency.value = 55.5; 

    // Low Pass Filter - Starts very closed (muffled)
    filter.type = 'lowpass';
    filter.frequency.value = 80; 
    filter.Q.value = 1;

    // Connections
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    // Fade in
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 4); // Slow fade in

    osc1.start(t);
    osc2.start(t);

    droneNodes = { osc1, osc2, gain, filter };

    // Start Pulse Loop
    if (pulseTimer) clearInterval(pulseTimer);
    pulseTimer = window.setInterval(playPulse, 800); // ~75 BPM Heartbeat
};

// --- Pulse Engine (The Progress Indicator) ---
const playPulse = () => {
    if (!audioCtx || !masterGain || currentIntensity <= 0.05) return;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    // Pulse properties change based on intensity
    // Low intensity: Deep thump (Triangle wave)
    // High intensity: Bright ping (Sine wave with FM-like qualities via high filter)
    
    osc.type = currentIntensity > 0.6 ? 'sine' : 'triangle';
    
    // Pitch follows a pentatonic scale relative to the drone (A)
    // 0-30%: A2 (110Hz)
    // 30-60%: E3 (165Hz)
    // 60-90%: A3 (220Hz)
    // 90%+: C#4 (277Hz)
    let freq = 110;
    if (currentIntensity > 0.3) freq = 164.81;
    if (currentIntensity > 0.6) freq = 220.00;
    if (currentIntensity > 0.9) freq = 277.18;

    osc.frequency.setValueAtTime(freq, t);

    // Filter opens up significantly with intensity
    filter.type = 'lowpass';
    const filterFreq = 200 + (currentIntensity * 2000); 
    filter.frequency.setValueAtTime(filterFreq, t);
    filter.Q.value = 5;

    // Envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1 + (currentIntensity * 0.15), t + 0.02); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4); // Decay

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.5);
};

export const startAmbience = () => {
    initAudio();
    if (audioCtx?.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    if (!droneNodes) {
        createDrone();
    }
};

export const stopAmbience = () => {
    if (!audioCtx || !droneNodes) return;
    
    const t = audioCtx.currentTime;
    
    // Fade out drone
    droneNodes.gain.gain.cancelScheduledValues(t);
    droneNodes.gain.gain.setValueAtTime(droneNodes.gain.gain.value, t);
    droneNodes.gain.gain.exponentialRampToValueAtTime(0.001, t + 1);
    
    const nodesToStop = droneNodes; // Capture closure
    setTimeout(() => {
        try {
            nodesToStop.osc1.stop();
            nodesToStop.osc2.stop();
            nodesToStop.osc1.disconnect();
            nodesToStop.osc2.disconnect();
        } catch(e) {}
    }, 1100);

    droneNodes = null;

    if (pulseTimer) {
        clearInterval(pulseTimer);
        pulseTimer = null;
    }
};

export const setMusicIntensity = (intensity: number) => {
    currentIntensity = Math.max(0, Math.min(1, intensity));
    
    if (droneNodes && audioCtx) {
        const t = audioCtx.currentTime;
        // Drone filter opens up slightly as you progress, adding tension
        const targetFreq = 80 + (intensity * 120); // 80Hz -> 200Hz
        droneNodes.filter.frequency.setTargetAtTime(targetFreq, t, 1);
        
        // Drone volume increases slightly
        droneNodes.gain.gain.setTargetAtTime(0.2 + (intensity * 0.1), t, 1);
    }
};

export const playSound = (type: 'click' | 'rotate' | 'glitch' | 'power' | 'win') => {
  initAudio();
  if (!audioCtx || !masterGain) return;
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  // Use a separate compressor/limiter for SFX could be good, but simple gain works
  gain.connect(masterGain);

  switch (type) {
    case 'rotate':
      // Mechanical Servo Sound
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      
      // Filter the click to make it less harsh
      const rFilter = audioCtx.createBiquadFilter();
      rFilter.type = 'lowpass';
      rFilter.frequency.value = 1000;
      osc.disconnect();
      osc.connect(rFilter);
      rFilter.connect(gain);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      
      osc.start(t);
      osc.stop(t + 0.08);
      break;

    case 'click':
      // High UI blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
      break;

    case 'glitch':
      // Harsh noise/saw
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.linearRampToValueAtTime(800, t + 0.05);
      osc.frequency.linearRampToValueAtTime(100, t + 0.1);
      
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      
      osc.start(t);
      osc.stop(t + 0.3);
      break;

    case 'power':
      // Satisfying Connection (Rising finish)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t); // A3
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.1); // A4
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      
      osc.start(t);
      osc.stop(t + 0.4);
      break;

    case 'win':
      // Victory Sequence (Stops Ambience)
      stopAmbience();
      
      // Arpeggio
      const notes = [440, 554.37, 659.25, 880, 1108.73]; // A Major 
      notes.forEach((freq, i) => {
        const o = audioCtx!.createOscillator();
        const g = audioCtx!.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.connect(masterGain!);
        
        const start = t + (i * 0.12);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.2, start + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, start + 1.5); // Long sustain
        
        o.start(start);
        o.stop(start + 1.5);
      });
      break;
  }
};
