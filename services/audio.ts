// Simple Web Audio API Synthesizer
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3; // Master volume
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playSound = (type: 'click' | 'rotate' | 'glitch' | 'power' | 'win') => {
  initAudio();
  if (!audioCtx || !masterGain) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(masterGain);

  switch (type) {
    case 'rotate':
      // Mechanical click: Short, high burst
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.05);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
      break;

    case 'glitch':
      // Glitch: Sawtooth noise-like
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.linearRampToValueAtTime(500, t + 0.1);
      osc.frequency.linearRampToValueAtTime(50, t + 0.2);
      
      // Modulate gain for static effect
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.setValueAtTime(0, t + 0.05);
      gain.gain.setValueAtTime(0.8, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      
      osc.start(t);
      osc.stop(t + 0.3);
      break;

    case 'power':
      // Power up: Low sine sweep rising
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.4);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.6, t + 0.1);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
      break;

    case 'win':
      // Victory: Major Arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
      notes.forEach((freq, i) => {
        const o = audioCtx!.createOscillator();
        const g = audioCtx!.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        o.connect(g);
        g.connect(masterGain!);
        const start = t + i * 0.1;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.4, start + 0.05);
        g.gain.exponentialRampToValueAtTime(0.01, start + 0.8);
        o.start(start);
        o.stop(start + 0.8);
      });
      break;
  }
};