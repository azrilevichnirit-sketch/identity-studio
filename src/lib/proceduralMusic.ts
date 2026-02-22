/**
 * Procedural lo-fi hip hop style music generator.
 * Chill but groovy — perfect background for focused gameplay.
 * Warm chords, vinyl crackle, head-nodding beat, melodic hooks.
 */

type ProceduralMusicEngine = {
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  isPlaying: () => boolean;
  dispose: () => void;
};

const BPM = 85;
const BEAT = 60 / BPM;

// Warm jazzy lo-fi chords (Em9 → Cmaj7 → Am9 → Bm7)
const CHORDS = [
  [164.81, 246.94, 329.63, 440.00, 493.88], // Em9
  [261.63, 329.63, 392.00, 493.88],          // Cmaj7
  [220.00, 261.63, 329.63, 440.00, 493.88],  // Am9
  [246.94, 293.66, 369.99, 440.00],           // Bm7
];

const BASS = [82.41, 130.81, 110.00, 123.47]; // E, C, A, B bass

// Melody notes — E minor pentatonic upper register
const MEL = [659.25, 739.99, 783.99, 987.77, 1108.73, 1318.51];

// Rhythmic melody patterns (beat subdivisions where melody plays)
const MEL_RHYTHMS = [
  [0, 0.5, 1.5, 2, 3],
  [0, 1, 1.75, 2.5, 3.5],
  [0.5, 1, 2, 2.5, 3],
  [0, 0.75, 1.5, 2.25, 3],
];

// Melody pitch sequences (indexes into MEL)
const MEL_SEQUENCES = [
  [0, 2, 4, 3, 2],
  [2, 4, 5, 4, 2],
  [1, 3, 2, 0, 1],
  [4, 3, 2, 3, 4],
];

export function createProceduralMusic(): ProceduralMusicEngine {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let playing = false;
  let disposed = false;
  let timer: number | null = null;
  let nextTime = 0;
  let step = 0; // 16th note steps (16 per bar)
  let barCount = 0;
  let phraseIdx = 0;
  let crackleNode: AudioBufferSourceNode | null = null;
  let activeOsc: OscillatorNode[] = [];
  let volumeScale = 1;

  function init() {
    if (ctx) return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.2 * volumeScale;

    // Warm lo-fi filter on master
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 4500;
    warmth.Q.value = 0.7;

    master.connect(warmth);
    warmth.connect(ctx.destination);

    // Start vinyl crackle
    startCrackle();
  }

  function startCrackle() {
    if (!ctx) return;
    // Create looping vinyl noise
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      // Sparse crackle pops
      d[i] = Math.random() < 0.002 ? (Math.random() * 2 - 1) * 0.3 : 0;
      // Very subtle hiss
      d[i] += (Math.random() * 2 - 1) * 0.008;
    }
    crackleNode = ctx.createBufferSource();
    crackleNode.buffer = buf;
    crackleNode.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0.15;
    crackleNode.connect(g);
    g.connect(ctx.destination);
    crackleNode.start();
  }

  function osc(freq: number, start: number, dur: number, vol: number, type: OscillatorType) {
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;

    // Soft attack, natural decay
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.03);
    g.gain.exponentialRampToValueAtTime(vol * 0.6, start + dur * 0.5);
    g.gain.linearRampToValueAtTime(0.001, start + dur);

    o.connect(g);
    g.connect(master);
    o.start(start);
    o.stop(start + dur + 0.05);
    activeOsc.push(o);
    o.onended = () => { activeOsc = activeOsc.filter(x => x !== o); };
  }

  // Lo-fi kick — deep and soft
  function kick(t: number) {
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.35);
    activeOsc.push(o);
    o.onended = () => { activeOsc = activeOsc.filter(x => x !== o); };
  }

  // Snappy snare with body
  function snare(t: number, soft = false) {
    if (!ctx || !master) return;
    const len = ctx.sampleRate * 0.1;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2500;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = soft ? 0.06 : 0.1;
    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    src.start(t);

    // Tonal body
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 180;
    og.gain.setValueAtTime(soft ? 0.06 : 0.1, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(og);
    og.connect(master);
    o.start(t);
    o.stop(t + 0.1);
    activeOsc.push(o);
    o.onended = () => { activeOsc = activeOsc.filter(x => x !== o); };
  }

  // Closed hi-hat
  function hat(t: number) {
    if (!ctx || !master) return;
    const len = ctx.sampleRate * 0.04;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.1));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.value = 0.04;
    src.connect(hp);
    hp.connect(g);
    g.connect(master);
    src.start(t);
  }

  function schedule() {
    if (!ctx || !playing) return;

    const sixteenth = BEAT / 4;

    while (nextTime < ctx.currentTime + 0.2) {
      const beatInBar = Math.floor(step / 4) % 4;
      const sub = step % 4; // 16th note within beat
      const chordIdx = Math.floor(step / 16) % 4;

      // === DRUMS — boom bap pattern ===
      // Kick: beat 1, ghost on "and" of 2, beat 3+
      if (beatInBar === 0 && sub === 0) kick(nextTime);
      if (beatInBar === 1 && sub === 2) kick(nextTime); // ghost kick
      if (beatInBar === 2 && sub === 0) kick(nextTime);
      if (beatInBar === 2 && sub === 3) kick(nextTime); // pickup

      // Snare: beats 2 and 4 (swung slightly)
      if (beatInBar === 1 && sub === 0) snare(nextTime);
      if (beatInBar === 3 && sub === 0) snare(nextTime);
      // Ghost snare
      if (beatInBar === 0 && sub === 3) snare(nextTime, true);

      // Hi-hats: every 8th note with some swing
      if (sub === 0) hat(nextTime);
      if (sub === 2) hat(nextTime + sixteenth * 0.15); // slight swing

      // === CHORDS — warm pads, play on beat 1 of each chord ===
      if (beatInBar === 0 && sub === 0) {
        const chord = CHORDS[chordIdx];
        chord.forEach(f => {
          // Detuned pair for warmth
          osc(f, nextTime, BEAT * 3.8, 0.035, 'sine');
          osc(f * 1.003, nextTime, BEAT * 3.8, 0.025, 'triangle');
        });
      }

      // === BASS — rhythmic with swing ===
      const bassFreq = BASS[chordIdx];
      if (sub === 0 && (beatInBar === 0 || beatInBar === 2)) {
        osc(bassFreq, nextTime, BEAT * 0.8, 0.18, 'triangle');
      }
      if (sub === 2 && beatInBar === 1) {
        osc(bassFreq * 1.5, nextTime, BEAT * 0.3, 0.1, 'triangle'); // octave fill
      }
      if (sub === 0 && beatInBar === 3) {
        osc(bassFreq * 0.75, nextTime, BEAT * 0.5, 0.12, 'triangle'); // walk down
      }

      // === MELODY — catchy lo-fi hook ===
      const rhythm = MEL_RHYTHMS[phraseIdx % MEL_RHYTHMS.length];
      const seq = MEL_SEQUENCES[phraseIdx % MEL_SEQUENCES.length];
      const beatPos = beatInBar + sub / 4;
      const rhythmIdx = rhythm.indexOf(beatPos);
      if (rhythmIdx !== -1) {
        const noteIdx = seq[rhythmIdx % seq.length];
        const note = MEL[noteIdx];
        const dur = BEAT * (0.3 + Math.random() * 0.3);
        // EP piano-like tone (sine + slight triangle)
        osc(note, nextTime, dur, 0.045, 'sine');
        osc(note * 2.01, nextTime, dur * 0.5, 0.015, 'sine'); // harmonic
      }

      nextTime += sixteenth;
      step++;

      // New phrase every 2 bars
      if (step % 32 === 0) {
        phraseIdx = (phraseIdx + 1) % MEL_RHYTHMS.length;
        barCount++;
      }
    }

    timer = window.setTimeout(schedule, 35);
  }

  return {
    start() {
      if (playing || disposed) return;
      init();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      playing = true;
      nextTime = ctx.currentTime + 0.1;
      step = 0;
      barCount = 0;
      phraseIdx = 0;
      schedule();
    },
    stop() {
      playing = false;
      if (timer !== null) { clearTimeout(timer); timer = null; }
      activeOsc.forEach(o => { try { o.stop(); } catch {} });
      activeOsc = [];
      if (crackleNode) { try { crackleNode.stop(); } catch {} crackleNode = null; }
    },
    setVolume(v: number) {
      volumeScale = Math.max(0, Math.min(1, v));
      if (master && ctx) {
        master.gain.linearRampToValueAtTime(0.2 * volumeScale, ctx.currentTime + 0.1);
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
