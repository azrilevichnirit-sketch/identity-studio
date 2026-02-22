/**
 * Procedural music generator — upbeat SimCity/simulation game style.
 * Energetic, bouncy, with funky bass, bright chords, and catchy melody.
 */

type ProceduralMusicEngine = {
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  isPlaying: () => boolean;
  dispose: () => void;
};

const TEMPO = 128; // Upbeat BPM
const BEAT = 60 / TEMPO;

// Bright major/funky chord progression (C → F → Am → G)
const CHORDS = [
  [261.63, 329.63, 392.00], // C
  [349.23, 440.00, 523.25], // F
  [220.00, 261.63, 329.63], // Am
  [196.00, 246.94, 293.66], // G
];

// Funky bass pattern per chord (root + octave jumps)
const BASS_PATTERNS = [
  [130.81, 261.63, 130.81, 196.00], // C bass groove
  [174.61, 349.23, 174.61, 261.63], // F bass groove
  [110.00, 220.00, 110.00, 164.81], // Am bass groove
  [98.00, 196.00, 98.00, 146.83],   // G bass groove
];

// Catchy pentatonic melody pool (C major pentatonic, higher octave)
const MELODY = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66];

// Pre-composed melody phrases (index into MELODY array) for catchiness
const PHRASES = [
  [0, 2, 4, 5, 4, 2, 3, 0],
  [2, 4, 5, 6, 5, 4, 2, 3],
  [4, 5, 4, 2, 0, 2, 4, 5],
  [5, 4, 2, 0, 2, 4, 5, 6],
];

export function createProceduralMusic(): ProceduralMusicEngine {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let playing = false;
  let disposed = false;
  let timer: number | null = null;
  let nextTime = 0;
  let beat = 0;
  let phraseIndex = 0;
  let activeNodes: AudioNode[] = [];

  function init() {
    if (ctx) return;
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.18;

    // Short delay for depth
    const delay = ctx.createDelay(0.3);
    delay.delayTime.value = 0.15;
    const fb = ctx.createGain();
    fb.gain.value = 0.15;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 3000;

    masterGain.connect(ctx.destination);
    masterGain.connect(delay);
    delay.connect(lpf);
    lpf.connect(fb);
    fb.connect(delay);
    delay.connect(ctx.destination);
  }

  function tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine') {
    if (!ctx || !masterGain) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;

    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.02);
    g.gain.setValueAtTime(vol, start + dur * 0.6);
    g.gain.linearRampToValueAtTime(0, start + dur);

    o.connect(g);
    g.connect(masterGain);
    o.start(start);
    o.stop(start + dur + 0.05);
    activeNodes.push(o);
    o.onended = () => { activeNodes = activeNodes.filter(n => n !== o); };
  }

  function kick(time: number) {
    if (!ctx || !masterGain) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    g.gain.setValueAtTime(0.35, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    o.connect(g);
    g.connect(masterGain);
    o.start(time);
    o.stop(time + 0.3);
    activeNodes.push(o);
    o.onended = () => { activeNodes = activeNodes.filter(n => n !== o); };
  }

  function snare(time: number) {
    if (!ctx || !masterGain) return;
    const len = ctx.sampleRate * 0.08;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.2));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000;
    bp.Q.value = 1;
    src.connect(bp);
    bp.connect(g);
    g.connect(masterGain);
    src.start(time);
  }

  function hihat(time: number, open = false) {
    if (!ctx || !masterGain) return;
    const len = ctx.sampleRate * (open ? 0.1 : 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.15));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 9000;
    const g = ctx.createGain();
    g.gain.value = open ? 0.06 : 0.04;
    src.connect(hp);
    hp.connect(g);
    g.connect(masterGain);
    src.start(time);
  }

  function schedule() {
    if (!ctx || !playing) return;

    while (nextTime < ctx.currentTime + 0.2) {
      const bar = Math.floor(beat / 16);
      const beatInBar = beat % 16;
      const chordIdx = Math.floor(beatInBar / 4) % 4;
      const subBeat = beatInBar % 4;

      // Drums - energetic pattern
      if (subBeat === 0 || subBeat === 2) kick(nextTime);                    // kick on 1 & 3
      if (subBeat === 1 || subBeat === 3) snare(nextTime);                   // snare on 2 & 4
      hihat(nextTime, subBeat === 2);                                          // hihat every beat, open on 3

      // Off-beat hihat for groove
      hihat(nextTime + BEAT * 0.5, false);

      // Stab chords - bright and short
      if (subBeat === 0) {
        const chord = CHORDS[chordIdx];
        chord.forEach(f => tone(f, nextTime, BEAT * 0.3, 0.07, 'square'));
        // Also on the "and" of beat 1 for funk
        chord.forEach(f => tone(f, nextTime + BEAT * 0.5, BEAT * 0.2, 0.04, 'square'));
      }
      if (subBeat === 3) {
        // Anticipation stab
        const nextChord = CHORDS[(chordIdx + 1) % 4];
        nextChord.forEach(f => tone(f, nextTime + BEAT * 0.5, BEAT * 0.2, 0.05, 'square'));
      }

      // Funky bass line
      const bassNote = BASS_PATTERNS[chordIdx][subBeat];
      const bassDur = subBeat % 2 === 0 ? BEAT * 0.7 : BEAT * 0.4;
      tone(bassNote, nextTime, bassDur, 0.2, 'sawtooth');

      // Catchy melody
      const phrase = PHRASES[phraseIndex % PHRASES.length];
      const melIdx = phrase[beatInBar % phrase.length];
      if (subBeat === 0 || subBeat === 2 || (subBeat === 1 && Math.random() > 0.5)) {
        const melNote = MELODY[melIdx];
        tone(melNote, nextTime, BEAT * (0.4 + Math.random() * 0.4), 0.06, 'triangle');
      }

      // Advance
      nextTime += BEAT;
      beat++;

      // Switch phrase every 2 bars
      if (beat % 32 === 0) {
        phraseIndex = (phraseIndex + 1) % PHRASES.length;
      }
    }

    timer = window.setTimeout(schedule, 40);
  }

  return {
    start() {
      if (playing || disposed) return;
      init();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      playing = true;
      nextTime = ctx.currentTime + 0.1;
      beat = 0;
      phraseIndex = 0;
      schedule();
    },
    stop() {
      playing = false;
      if (timer !== null) { clearTimeout(timer); timer = null; }
      activeNodes.forEach(n => { try { (n as OscillatorNode).stop(); } catch {} });
      activeNodes = [];
    },
    setVolume(v: number) {
      if (masterGain && ctx) {
        masterGain.gain.linearRampToValueAtTime(
          Math.max(0, Math.min(1, v)) * 0.18,
          ctx.currentTime + 0.1
        );
      }
    },
    isPlaying() { return playing; },
    dispose() {
      this.stop();
      disposed = true;
      if (ctx) { ctx.close(); ctx = null; }
    },
  };
}
