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

  // Unlock both audio elements on first user interaction (critical for iOS/mobile)
  useEffect(() => {
    if (unlockedRef.current) return;

    const unlockAll = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;

      const main = mainAudioRef.current;
      const proc = procAudioRef.current;

      // Unlock each element by doing a silent play
      [main, proc].forEach(audio => {
        if (!audio) return;
        const savedVol = audio.volume;
        audio.volume = 0;
        const p = audio.play();
        if (p) p.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = savedVol;
        }).catch(() => {});
      });

      console.log('[AudioManager] Audio unlocked via user gesture, desired mode:', desiredModeRef.current);

      // After unlocking, if we have a desired mode that failed before, re-trigger
      // by bumping a dummy state. We do this via a small timeout to let the unlock settle.
      setTimeout(() => {
        const desired = desiredModeRef.current;
        if (desired !== 'none') {
          const audio = desired === 'main' ? mainAudioRef.current : procAudioRef.current;
          if (audio && audio.paused) {
            console.log('[AudioManager] Post-unlock: starting', desired);
            audio.volume = 0;
            audio.play().then(() => {
              // Fade in
              const target = desired === 'main' ? MAIN_VOL : 0.3;
              const timerRef = desired === 'main' ? mainFadeRef : procFadeRef;
              // Simple inline fade
              const id = window.setInterval(() => {
                if (audio.volume >= target - 0.01) {
                  audio.volume = target;
                  clearInterval(id);
                  return;
                }
                audio.volume = Math.min(target, audio.volume + FADE_STEP);
              }, FADE_INTERVAL);
            }).catch(() => {});
          }
        }
      }, 100);

      document.removeEventListener('click', unlockAll, true);
      document.removeEventListener('touchstart', unlockAll, true);
      document.removeEventListener('pointerdown', unlockAll, true);
    };

    document.addEventListener('click', unlockAll, { capture: true });
    document.addEventListener('touchstart', unlockAll, { capture: true });
    document.addEventListener('pointerdown', unlockAll, { capture: true });

    return () => {
      document.removeEventListener('click', unlockAll, true);
      document.removeEventListener('touchstart', unlockAll, true);
      document.removeEventListener('pointerdown', unlockAll, true);
    };
  }, []);

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
        if (!isCurrentTransition()) return;
        main.pause();
        main.currentTime = 0;
        main.volume = 0;
        onDone?.();
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
        if (!isCurrentTransition()) return;
        proc.pause();
        proc.currentTime = 0;
        proc.volume = 0;
        onDone?.();
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
      stopProc(() => {
        if (!isCurrentTransition()) return;
        startMain();
      });
    } else if (mode === 'proc') {
      stopMain(() => {
        if (!isCurrentTransition()) return;
        startProc(prevMode !== 'proc');
      });
    } else {
      stopMain();
      stopProc();
    }

    prevModeRef.current = mode;

    return () => {
      clearFade(mainFadeRef);
      clearFade(procFadeRef);
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
