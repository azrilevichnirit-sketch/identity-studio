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
const PROC_START = 21;
const MAIN_VOL = 0.3;
const FADE_STEP = 0.008;
const FADE_INTERVAL = 25;

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

  const playWithUnlock = useCallback((audio: HTMLAudioElement, onStarted?: () => void) => {
    audio.play().then(() => {
      onStarted?.();
    }).catch(() => {
      const unlock = () => {
        audio.play().then(() => {
          onStarted?.();
        }).catch(() => {});
      };

      document.addEventListener('click', unlock, { once: true });
      document.addEventListener('touchstart', unlock, { once: true });
    });
  }, []);

  useEffect(() => {
    const main = new Audio(MAIN_SRC);
    main.loop = true;
    main.preload = 'auto';
    main.volume = 0;

    const proc = new Audio(PROC_SRC);
    proc.loop = false;
    proc.preload = 'auto';
    proc.volume = 0;

    const handleProcEnded = () => {
      if (procAudioRef.current !== proc) return;
      proc.currentTime = PROC_START;
      proc.play().catch(() => {});
    };

    proc.addEventListener('ended', handleProcEnded);

    mainAudioRef.current = main;
    procAudioRef.current = proc;

    return () => {
      clearFade(mainFadeRef);
      clearFade(procFadeRef);
      main.pause();
      proc.pause();
      proc.removeEventListener('ended', handleProcEnded);
      mainAudioRef.current = null;
      procAudioRef.current = null;
      prevModeRef.current = 'none';
    };
  }, [clearFade]);

  useEffect(() => {
    const main = mainAudioRef.current;
    const proc = procAudioRef.current;
    if (!main || !proc) return;

    const isProcessingPhase = phase === 'lead' || phase === 'processing' || phase === 'summary';
    const mode: AudioMode = isProcessingPhase ? 'proc' : (isProcessing ? 'proc' : (isPlaying ? 'main' : 'none'));
    const prevMode = prevModeRef.current;

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
        proc.volume = 0;
        onDone?.();
        return;
      }

      fadeAudio(proc, 0, procFadeRef, () => {
        if (!isCurrentTransition()) return;
        proc.pause();
        proc.volume = 0;
        onDone?.();
      });
    };

    const startMain = () => {
      if (!isCurrentTransition()) return;
      if (main.paused) {
        main.currentTime = 0;
        main.volume = 0;
        playWithUnlock(main, () => {
          if (!isCurrentTransition()) return;
          fadeAudio(main, targetMain, mainFadeRef);
        });
      } else {
        fadeAudio(main, targetMain, mainFadeRef);
      }
    };

    const startProc = (resetStartPoint: boolean) => {
      if (!isCurrentTransition()) return;
      if (resetStartPoint) {
        if (proc.readyState >= 1) {
          proc.currentTime = PROC_START;
        } else {
          const seekToProcStart = () => {
            proc.currentTime = PROC_START;
            proc.removeEventListener('loadedmetadata', seekToProcStart);
          };
          proc.addEventListener('loadedmetadata', seekToProcStart, { once: true });
        }
      }

      if (proc.paused) {
        proc.volume = 0;
        playWithUnlock(proc, () => {
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
  }, [phase, isPlaying, isProcessing, muted, softVolume, clearFade, fadeAudio, playWithUnlock]);

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
