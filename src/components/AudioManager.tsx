import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  isPlaying: boolean;
  isProcessing?: boolean;
}

/**
 * Cross-fades between main bg music and processing music.
 * Uses Web Audio API GainNodes for reliable mobile volume control
 * (iOS Safari ignores HTMLAudioElement.volume).
 */
export function AudioManager({ isPlaying, isProcessing = false }: AudioManagerProps) {
  const ctxRef = useRef<AudioContext | null>(null);

  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const mainSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);

  const procAudioRef = useRef<HTMLAudioElement | null>(null);
  const procSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const procGainRef = useRef<GainNode | null>(null);

  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const userInteractedRef = useRef(false);

  const MAIN_VOL = 0.3;
  const PROC_VOL = 0.3;
  const FADE_MS = 800;
  const PROC_START_SEC = 21;

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Ensure AudioContext exists (created on first user gesture)
  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  // Resume AudioContext (needed after user gesture on mobile)
  const resumeCtx = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }, []);

  // Setup main audio element + Web Audio nodes
  const ensureMain = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;

    if (!mainAudioRef.current) {
      const audio = new Audio('/audio/bg-music.mp3');
      audio.loop = true;
      audio.crossOrigin = 'anonymous';
      // Keep html volume at max; control via GainNode
      audio.volume = 1;
      mainAudioRef.current = audio;

      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(ctx.destination);
      mainSourceRef.current = source;
      mainGainRef.current = gain;
    }
  }, [ensureCtx]);

  // Setup processing audio element + Web Audio nodes
  const ensureProc = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;

    if (!procAudioRef.current) {
      const audio = new Audio('/audio/processing-music.mp3');
      audio.crossOrigin = 'anonymous';
      audio.volume = 1;
      procAudioRef.current = audio;

      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(ctx.destination);
      procSourceRef.current = source;
      procGainRef.current = gain;

      // Loop back to PROC_START_SEC instead of beginning
      audio.addEventListener('ended', () => {
        audio.currentTime = PROC_START_SEC;
        audio.play().catch(() => {});
      });
    }
  }, [ensureCtx]);

  // Fade a GainNode to target value
  const fadeTo = useCallback((gain: GainNode | null, target: number) => {
    if (!gain || !ctxRef.current) return;
    const now = ctxRef.current.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(target, now + FADE_MS / 1000);
  }, []);

  // Play helper that handles autoplay restrictions
  const safePlay = useCallback((audio: HTMLAudioElement) => {
    const promise = audio.play();
    if (promise) {
      promise.catch(() => {
        // Will retry on next user interaction
        if (!userInteractedRef.current) {
          const unlock = () => {
            userInteractedRef.current = true;
            resumeCtx();
            audio.play().catch(() => {});
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('click', unlock);
          };
          document.addEventListener('touchstart', unlock, { once: true });
          document.addEventListener('click', unlock, { once: true });
        }
      });
    }
  }, [resumeCtx]);

  // Main music control
  useEffect(() => {
    ensureMain();
    const audio = mainAudioRef.current;
    const gain = mainGainRef.current;
    if (!audio || !gain) return;

    resumeCtx();

    const shouldPlay = isPlaying && !isProcessing && !muted;

    if (shouldPlay) {
      safePlay(audio);
      fadeTo(gain, MAIN_VOL);
    } else {
      // Fade out, then pause to save resources
      fadeTo(gain, 0);
      const pauseTimer = setTimeout(() => {
        if (!audio.paused) {
          audio.pause();
        }
      }, FADE_MS + 50);
      return () => clearTimeout(pauseTimer);
    }
  }, [isPlaying, isProcessing, muted, ensureMain, resumeCtx, fadeTo, safePlay]);

  // Processing music control
  useEffect(() => {
    ensureProc();
    const audio = procAudioRef.current;
    const gain = procGainRef.current;
    if (!audio || !gain) return;

    resumeCtx();

    const shouldPlay = isProcessing && !muted;

    if (shouldPlay) {
      // Only reset to start position if not already playing
      if (audio.paused) {
        audio.currentTime = PROC_START_SEC;
      }
      safePlay(audio);
      fadeTo(gain, PROC_VOL);
    } else {
      fadeTo(gain, 0);
      const pauseTimer = setTimeout(() => {
        if (!audio.paused) {
          audio.pause();
        }
      }, FADE_MS + 50);
      return () => clearTimeout(pauseTimer);
    }
  }, [isProcessing, muted, ensureProc, resumeCtx, fadeTo, safePlay]);

  // Cleanup
  useEffect(() => {
    return () => {
      mainAudioRef.current?.pause();
      procAudioRef.current?.pause();
      ctxRef.current?.close().catch(() => {});
      mainAudioRef.current = null;
      procAudioRef.current = null;
      ctxRef.current = null;
    };
  }, []);

  const handleToggleMute = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    userInteractedRef.current = true;
    resumeCtx();
    setMuted((prev) => !prev);
  }, [resumeCtx]);

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
