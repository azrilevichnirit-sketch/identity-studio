import { forwardRef, useCallback, useEffect, useRef, useState, type MouseEvent, type MutableRefObject } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  phase: string;
  isPlaying: boolean;
  isProcessing?: boolean;
  softVolume?: number;
}

type AudioMode = 'main' | 'proc' | 'none';

const MAIN_SRC = '/audio/bg-music.mp3';
const PROC_SRC = '/audio/processing-music.mp3';
const MAIN_VOL = 0.3;
const FADE_STEP = 0.008;
const FADE_INTERVAL = 25;
const PROC_LOOP_START = 21; // Loop processing music from second 21

export const AudioManager = forwardRef<HTMLButtonElement, AudioManagerProps>(function AudioManager(
  { phase, isPlaying, isProcessing = false, softVolume },
  ref
) {
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const procAudioRef = useRef<HTMLAudioElement | null>(null);
  const mainFadeRef = useRef<number | null>(null);
  const procFadeRef = useRef<number | null>(null);
  const transitionIdRef = useRef(0);
  const prevModeRef = useRef<AudioMode>('none');
  const unlockedRef = useRef(false);
  // Track desired mode so we can retry after unlock
  const desiredModeRef = useRef<AudioMode>('none');
  // Ref for softVolume so watchdog can access latest value without re-registering listeners
  const softVolumeRef = useRef(softVolume);
  softVolumeRef.current = softVolume;

  const [muted, setMuted] = useState(false);

  const clearFade = useCallback((timerRef: MutableRefObject<number | null>) => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fadeAudio = useCallback((
    audio: HTMLAudioElement,
    target: number,
    timerRef: MutableRefObject<number | null>,
    onDone?: () => void
  ) => {
    clearFade(timerRef);
    timerRef.current = window.setInterval(() => {
      const current = audio.volume;
      const diff = target - current;

      if (Math.abs(diff) <= FADE_STEP + 0.001) {
        audio.volume = target;
        clearFade(timerRef);
        onDone?.();
        return;
      }

      audio.volume = current + (diff > 0 ? FADE_STEP : -FADE_STEP);
    }, FADE_INTERVAL);
  }, [clearFade]);

  // Create audio elements once
  useEffect(() => {
    const main = new Audio(MAIN_SRC);
    main.loop = true;
    main.preload = 'auto';
    main.volume = 0;

    const proc = new Audio(PROC_SRC);
    proc.loop = false; // Manual loop from second 21
    proc.preload = 'auto';
    proc.volume = 0;

    // Manual loop: when processing music ends, restart from second 21
    const handleProcEnded = () => {
      console.log(`[AudioManager] proc ended, looping from ${PROC_LOOP_START}s`);
      proc.currentTime = PROC_LOOP_START;
      proc.play().catch(() => {});
    };
    proc.addEventListener('ended', handleProcEnded);

    mainAudioRef.current = main;
    procAudioRef.current = proc;

    return () => {
      clearFade(mainFadeRef);
      clearFade(procFadeRef);
      proc.removeEventListener('ended', handleProcEnded);
      main.pause();
      proc.pause();
      mainAudioRef.current = null;
      procAudioRef.current = null;
      prevModeRef.current = 'none';
    };
  }, [clearFade]);

  // Persistent watchdog: on EVERY user interaction, check if the desired audio
  // should be playing but isn't (because mobile blocked it), and retry.
  // This is critical for iOS where each Audio element needs to be play()-ed
  // during a user gesture, and the proc element might not have been loaded
  // during the first gesture.
  useEffect(() => {
    const onInteraction = () => {
      const desired = desiredModeRef.current;
      if (desired === 'none') return;

      const audio = desired === 'main' ? mainAudioRef.current : procAudioRef.current;
      if (!audio || !audio.paused) return; // Already playing, nothing to do

      const isMutedNow = audio.muted;
      if (isMutedNow) return; // User muted, don't force play

      console.log(`[AudioManager] Watchdog: ${desired} should play but is paused, retrying in gesture context`);
      audio.volume = 0;
      audio.play().then(() => {
        if (desiredModeRef.current !== desired) {
          audio.pause();
          return;
        }
        // Fade in
        const target = desired === 'main' ? MAIN_VOL : (softVolumeRef.current ?? 0.3);
        const timerRef = desired === 'main' ? mainFadeRef : procFadeRef;
        clearFade(timerRef);
        timerRef.current = window.setInterval(() => {
          if (audio.volume >= target - 0.01) {
            audio.volume = target;
            if (timerRef.current !== null) clearInterval(timerRef.current);
            timerRef.current = null;
            return;
          }
          audio.volume = Math.min(target, audio.volume + FADE_STEP);
        }, FADE_INTERVAL);
      }).catch(() => {});
    };

    document.addEventListener('click', onInteraction, { capture: true });
    document.addEventListener('touchstart', onInteraction, { capture: true });

    return () => {
      document.removeEventListener('click', onInteraction, true);
      document.removeEventListener('touchstart', onInteraction, true);
    };
  }, [clearFade]);

  // Main transition effect
  useEffect(() => {
    const main = mainAudioRef.current;
    const proc = procAudioRef.current;
    if (!main || !proc) return;

    const isProcPhase = phase === 'lead' || phase === 'processing' || phase === 'summary';
    const mode: AudioMode = isProcPhase ? 'proc' : (isPlaying ? 'main' : 'none');
    const prevMode = prevModeRef.current;

    // Store desired mode for post-unlock retry
    desiredModeRef.current = mode;

    console.log(`[AudioManager] phase=${phase}, mode=${mode}, prevMode=${prevMode}, muted=${muted}, unlocked=${unlockedRef.current}`);

    const targetMain = muted ? 0 : MAIN_VOL;
    const targetProc = muted ? 0 : (softVolume ?? 0.3);

    main.muted = muted;
    proc.muted = muted;

    transitionIdRef.current += 1;
    const transitionId = transitionIdRef.current;
    const isCurrentTransition = () => transitionId === transitionIdRef.current;

    const stopMain = (onDone?: () => void) => {
      if (main.paused || main.volume <= 0.001) {
        main.pause();
        main.currentTime = 0;
        main.volume = 0;
        onDone?.();
        return;
      }

      fadeAudio(main, 0, mainFadeRef, () => {
        // Always pause when fade completes - even if a newer transition started.
        // Skipping this was causing dual-music bugs when transitions overlap.
        main.pause();
        main.currentTime = 0;
        main.volume = 0;
        if (isCurrentTransition()) onDone?.();
      });
    };

    const stopProc = (onDone?: () => void) => {
      if (proc.paused || proc.volume <= 0.001) {
        proc.pause();
        proc.currentTime = 0;
        proc.volume = 0;
        onDone?.();
        return;
      }

      fadeAudio(proc, 0, procFadeRef, () => {
        // Always pause when fade completes - even if a newer transition started.
        proc.pause();
        proc.currentTime = 0;
        proc.volume = 0;
        if (isCurrentTransition()) onDone?.();
      });
    };

    const tryPlay = (audio: HTMLAudioElement, onSuccess: () => void) => {
      if (!isCurrentTransition()) return;
      audio.play().then(() => {
        if (!isCurrentTransition()) { audio.pause(); return; }
        onSuccess();
      }).catch(() => {
        console.log('[AudioManager] play() blocked - will retry after user gesture');
      });
    };

    const startMain = () => {
      if (!isCurrentTransition()) return;
      if (main.paused) {
        main.currentTime = 0;
        main.volume = 0;
        tryPlay(main, () => {
          if (!isCurrentTransition()) return;
          fadeAudio(main, targetMain, mainFadeRef);
        });
      } else {
        fadeAudio(main, targetMain, mainFadeRef);
      }
    };

    const startProc = (resetFromStart: boolean) => {
      if (!isCurrentTransition()) return;

      if (resetFromStart) {
        if (proc.readyState >= 1) {
          proc.currentTime = 0;
        } else {
          proc.addEventListener('loadedmetadata', () => { proc.currentTime = 0; }, { once: true });
        }
      }

      if (proc.paused) {
        proc.volume = 0;
        tryPlay(proc, () => {
          if (!isCurrentTransition()) return;
          fadeAudio(proc, targetProc, procFadeRef);
        });
      } else {
        fadeAudio(proc, targetProc, procFadeRef);
      }
    };

    if (mode === 'main') {
      // HARD KILL: immediately silence proc before doing anything else
      clearFade(procFadeRef);
      proc.pause();
      proc.volume = 0;
      startMain();
    } else if (mode === 'proc') {
      // HARD KILL: immediately silence main before doing anything else
      clearFade(mainFadeRef);
      main.pause();
      main.volume = 0;
      main.currentTime = 0;
      startProc(prevMode !== 'proc');
    } else {
      clearFade(mainFadeRef);
      clearFade(procFadeRef);
      main.pause(); main.volume = 0;
      proc.pause(); proc.volume = 0;
    }

    prevModeRef.current = mode;

    return () => {
      clearFade(mainFadeRef);
      clearFade(procFadeRef);
      // Safety: force-pause whichever audio shouldn't be playing for the current mode.
      // This prevents dual-music when effects re-run mid-fade.
      if (mode === 'proc' && !main.paused) {
        main.pause();
        main.volume = 0;
      }
      if (mode === 'main' && !proc.paused) {
        proc.pause();
        proc.volume = 0;
      }
      if (mode === 'none') {
        if (!main.paused) { main.pause(); main.volume = 0; }
        if (!proc.paused) { proc.pause(); proc.volume = 0; }
      }
    };
  }, [phase, isPlaying, muted, softVolume, clearFade, fadeAudio]);

  const handleToggleMute = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setMuted((prev) => !prev);
  }, []);

  if (!isPlaying && !isProcessing) return null;

  return (
    <button
      ref={ref}
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
});

AudioManager.displayName = 'AudioManager';
