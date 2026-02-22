/**
 * Procedural ambient music generator in SimCity/simulation game style.
 * Uses Web Audio API to create a pleasant looping background track
 * with jazzy chords, soft bass, and gentle melody.
 */

type ProceduralMusicEngine = {
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  isPlaying: () => boolean;
  dispose: () => void;
};

// Musical constants
const TEMPO = 95; // BPM - relaxed SimCity feel
const BEAT_DURATION = 60 / TEMPO;

// Jazz-influenced chord progression (Cmaj7 → Am7 → Dm7 → G7)
const CHORD_PROGRESSION = [
  [261.63, 329.63, 392.00, 493.88], // Cmaj7
  [220.00, 261.63, 329.63, 392.00], // Am7
  [293.66, 349.23, 440.00, 523.25], // Dm7
  [196.00, 246.94, 293.66, 349.23], // G7
];

// Pentatonic melody notes (C major pentatonic, octave 5)
const MELODY_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

// Bass notes matching chord roots
const BASS_NOTES = [130.81, 110.00, 146.83, 98.00];

export function createProceduralMusic(): ProceduralMusicEngine {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let playing = false;
  let disposed = false;
  let schedulerTimer: number | null = null;
  let nextNoteTime = 0;
  let currentBeat = 0;
  let activeOscillators: OscillatorNode[] = [];

  function init() {
    if (ctx) return;
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.15; // Soft background level

    // Add a gentle reverb-like effect via delay
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.2;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2000;

    masterGain.connect(ctx.destination);
    masterGain.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(feedback);
    feedback.connect(delay);
    delay.connect(ctx.destination);
  }

  function playTone(
    freq: number,
    startTime: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine'
  ) {
    if (!ctx || !masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    // Smooth envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
    gain.gain.setValueAtTime(volume, startTime + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);

    activeOscillators.push(osc);
    osc.onended = () => {
      activeOscillators = activeOscillators.filter(o => o !== osc);
    };
  }

  function scheduleChord(time: number, chordIndex: number) {
    const chord = CHORD_PROGRESSION[chordIndex % CHORD_PROGRESSION.length];
    // Pad chords - soft and sustained
    chord.forEach(freq => {
      playTone(freq, time, BEAT_DURATION * 3.8, 0.08, 'sine');
    });
  }

  function scheduleBass(time: number, chordIndex: number) {
    const bassNote = BASS_NOTES[chordIndex % BASS_NOTES.length];
    playTone(bassNote, time, BEAT_DURATION * 1.8, 0.25, 'triangle');
    // Ghost note on beat 3
    playTone(bassNote * 1.5, time + BEAT_DURATION * 2, BEAT_DURATION * 0.8, 0.1, 'triangle');
  }

  function scheduleMelody(time: number, beat: number) {
    // Play melody on some beats with some randomness for organic feel
    if (Math.random() > 0.45) {
      const noteIndex = Math.floor(Math.random() * MELODY_NOTES.length);
      const note = MELODY_NOTES[noteIndex];
      const duration = BEAT_DURATION * (0.5 + Math.random() * 1.5);
      playTone(note, time, duration, 0.06 + Math.random() * 0.04, 'sine');
    }
  }

  function scheduler() {
    if (!ctx || !playing) return;

    // Schedule notes ahead of time for smooth playback
    while (nextNoteTime < ctx.currentTime + 0.2) {
      const chordIndex = Math.floor(currentBeat / 4);

      // Every 4 beats = new chord
      if (currentBeat % 4 === 0) {
        scheduleChord(nextNoteTime, chordIndex);
        scheduleBass(nextNoteTime, chordIndex);
      }

      // Melody on each beat
      scheduleMelody(nextNoteTime, currentBeat);

      // Hi-hat like percussion (very subtle)
      if (currentBeat % 2 === 0) {
        playHiHat(nextNoteTime);
      }

      nextNoteTime += BEAT_DURATION;
      currentBeat = (currentBeat + 1) % 16; // 16 beats = 4 bars loop
    }

    schedulerTimer = window.setTimeout(scheduler, 50);
  }

  function playHiHat(time: number) {
    if (!ctx || !masterGain) return;

    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    const gain = ctx.createGain();
    gain.gain.value = 0.03;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    source.start(time);
  }

  return {
    start() {
      if (playing || disposed) return;
      init();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      playing = true;
      nextNoteTime = ctx.currentTime + 0.1;
      currentBeat = 0;
      scheduler();
    },

    stop() {
      playing = false;
      if (schedulerTimer !== null) {
        clearTimeout(schedulerTimer);
        schedulerTimer = null;
      }
      // Fade out active oscillators
      activeOscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      activeOscillators = [];
    },

    setVolume(v: number) {
      if (masterGain) {
        masterGain.gain.linearRampToValueAtTime(
          Math.max(0, Math.min(1, v)) * 0.15,
          ctx?.currentTime ? ctx.currentTime + 0.1 : 0
        );
      }
    },

    isPlaying() {
      return playing;
    },

    dispose() {
      this.stop();
      disposed = true;
      if (ctx) {
        ctx.close();
        ctx = null;
      }
    },
  };
}
