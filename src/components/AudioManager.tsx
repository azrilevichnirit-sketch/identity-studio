import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  isPlaying: boolean;
  isProcessing?: boolean;
}

/**
 * Manages two audio tracks with crossfade:
 * 1. Main bg music (during gameplay)
 * 2. Processing music (during lead form + processing screen, starts at 21s)
 *
 * Mobile-safe: unlocks audio on first touch/click, uses Web Audio API
 * GainNodes for volume control (iOS ignores HTMLAudioElement.volume).
 */
export function AudioManager({ isPlaying, isProcessing = false }: AudioManagerProps) {
  const [muted, setMuted] = useState(false);

  // Refs for state access inside callbacks
  const mutedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const isProcessingRef = useRef(isProcessing);

  // Audio infrastructure
  const ctxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  // Main music refs
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const mainConnectedRef = useRef(false);

  // Processing music refs
  const procAudioRef = useRef<HTMLAudioElement | null>(null);
  const procGainRef = useRef<GainNode | null>(null);
  const procConnectedRef = useRef(false);

  const MAIN_VOL = 0.3;
  const PROC_VOL = 0.3;
  const FADE_SEC = 0.8;
  const PROC_START = 21;

  // Keep refs in sync
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  // Create audio elements eagerly (no AudioContext yet)
  useEffect(() => {
    if (!mainAudioRef.current) {
      const a = new Audio('/audio/bg-music.mp3');
      a.loop = true;
      a.preload = 'auto';
      mainAudioRef.current = a;
    }
    if (!procAudioRef.current) {
      const a = new Audio('/audio/processing-music.mp3');
      a.preload = 'auto';
      // Don't set loop — we handle custom looping back to 21s
      a.loop = false;
      procAudioRef.current = a;

      a.addEventListener('ended', () => {
        a.currentTime = PROC_START;
        a.play().catch(() => {});
      });
    }
  }, []);

  // Unlock audio on mobile: must happen inside a user gesture
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;

    // Create AudioContext on gesture
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // "Unlock" both audio elements for iOS by playing them briefly
    [mainAudioRef.current, procAudioRef.current].forEach(audio => {
      if (!audio) return;
      audio.muted = true;
      const p = audio.play();
      if (p) {
        p.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        }).catch(() => {
          audio.muted = false;
        });
      }
    });

    // Connect to Web Audio API for gain control
    if (mainAudioRef.current && !mainConnectedRef.current) {
      try {
        const source = ctx.createMediaElementSource(mainAudioRef.current);
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(ctx.destination);
        mainGainRef.current = gain;
        mainConnectedRef.current = true;
      } catch {}
    }
    if (procAudioRef.current && !procConnectedRef.current) {
      try {
        const source = ctx.createMediaElementSource(procAudioRef.current);
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(ctx.destination);
        procGainRef.current = gain;
        procConnectedRef.current = true;
      } catch {}
    }

    // Now apply current desired state
    applyState();
  }, []);

  // Register unlock listeners
  useEffect(() => {
    const events = ['click', 'touchstart', 'touchend', 'keydown'];
    const handler = () => {
      unlock();
      events.forEach(e => document.removeEventListener(e, handler));
    };
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));
    return () => {
      events.forEach(e => document.removeEventListener(e, handler));
    };
  }, [unlock]);

  // Fade gain to target
  const fadeTo = useCallback((gain: GainNode | null, target: number) => {
    if (!gain || !ctxRef.current) return;
    const now = ctxRef.current.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(target, now + FADE_SEC);
  }, []);

  // Core state application — decides what should play/stop
  const applyState = useCallback(() => {
    const ctx = ctxRef.current;
    const mainAudio = mainAudioRef.current;
    const procAudio = procAudioRef.current;
    const mainGain = mainGainRef.current;
    const procGain = procGainRef.current;
    const isMuted = mutedRef.current;

    // If not unlocked yet, nothing to do (will apply after unlock)
    if (!unlockedRef.current || !ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // --- Main music ---
    const wantMain = isPlayingRef.current && !isProcessingRef.current && !isMuted;
    if (mainAudio) {
      if (wantMain) {
        if (mainAudio.paused) mainAudio.play().catch(() => {});
        if (mainGain) fadeTo(mainGain, MAIN_VOL);
        else mainAudio.volume = MAIN_VOL; // fallback
      } else {
        if (mainGain) {
          fadeTo(mainGain, 0);
          setTimeout(() => { if (!isPlayingRef.current || isProcessingRef.current || mutedRef.current) mainAudio.pause(); }, (FADE_SEC * 1000) + 50);
        } else {
          mainAudio.pause();
        }
      }
    }

    // --- Processing music ---
    const wantProc = isProcessingRef.current && !isMuted;
    if (procAudio) {
      if (wantProc) {
        if (procAudio.paused) {
          procAudio.currentTime = PROC_START;
          procAudio.play().catch(() => {});
        }
        if (procGain) fadeTo(procGain, PROC_VOL);
        else procAudio.volume = PROC_VOL;
      } else {
        if (procGain) {
          fadeTo(procGain, 0);
          setTimeout(() => { if (!isProcessingRef.current || mutedRef.current) { procAudio.pause(); } }, (FADE_SEC * 1000) + 50);
        } else {
          procAudio.pause();
        }
      }
    }
  }, [fadeTo]);

  // React to prop/state changes
  useEffect(() => {
    applyState();
  }, [isPlaying, isProcessing, muted, applyState]);

  // Cleanup
  useEffect(() => {
    return () => {
      mainAudioRef.current?.pause();
      procAudioRef.current?.pause();
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  const handleToggleMute = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    unlock(); // Ensure unlocked on this gesture
    setMuted(prev => !prev);
  }, [unlock]);

  if (!isPlaying && !isProcessing) return null;

  return (
    <button
      type="button"
      onClick={handleToggleMute}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      className="fixed bottom-3 right-3 z-[9999] inline-flex items-center justify-center rounded-full transition-transform active:scale-95 h-8 w-8 md:h-11 md:w-11"
      style={{
        background: 'rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      {muted
        ? <VolumeX className="text-white/80 w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />
        : <Volume2 className="text-white/80 w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />}
    </button>
  );
}
