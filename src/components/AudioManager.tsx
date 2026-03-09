import { useCallback, useEffect, useRef, useState, type MouseEvent, type MutableRefObject } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  isPlaying: boolean;
  isProcessing?: boolean;
  softVolume?: number;
}

type AudioMode = 'main' | 'proc' | 'none';

export function AudioManager({ isPlaying, isProcessing = false, softVolume }: AudioManagerProps) {
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const procAudioRef = useRef<HTMLAudioElement | null>(null);
  const mainFadeRef = useRef<number | null>(null);
  const procFadeRef = useRef<number | null>(null);
  const transitionIdRef = useRef(0);
  const prevModeRef = useRef<AudioMode>('none');

  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  const MAIN_VOL = 0.3;
  const PROC_VOL = softVolume ?? 0.3;
  const PROC_START = 21;
  const FADE_STEP = 0.008;
  const FADE_INTERVAL = 25;

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const clearFade = useCallback((timerRef: MutableRefObject<number | null>) => {
    if (timerRef.current) {
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

      if (Math.abs(diff) < FADE_STEP + 0.001) {
        audio.volume = target;
        clearFade(timerRef);
        onDone?.();
        return;
      }

      audio.volume = current + (diff > 0 ? FADE_STEP : -FADE_STEP);
    }, FADE_INTERVAL);
  }, [clearFade]);

  const playWithUnlock = useCallback((audio: HTMLAudioElement, onStart?: () => void) => {
    audio.play().then(() => {
      onStart?.();
    }).catch(() => {
      const unlock = () => {
        audio.play().then(() => {
          onStart?.();
        }).catch(() => {});
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
      };
      document.addEventListener('click', unlock, { once: true });
      document.addEventListener('touchstart', unlock, { once: true });
    });
  }, []);

  const ensureMain = useCallback(() => {
    if (!mainAudioRef.current) {
      const audio = new Audio('/audio/bg-music.mp3');
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;
      mainAudioRef.current = audio;
    }
    return mainAudioRef.current;
  }, []);

  const ensureProc = useCallback(() => {
    if (!procAudioRef.current) {
      const audio = new Audio('/audio/processing-music.mp3');
      audio.loop = false;
      audio.preload = 'auto';
      audio.volume = 0;
      audio.addEventListener('ended', () => {
        if (!procAudioRef.current || procAudioRef.current !== audio) return;
        audio.currentTime = PROC_START;
        audio.play().catch(() => {});
      });
      procAudioRef.current = audio;
    }
    return procAudioRef.current;
  }, [PROC_START]);

  useEffect(() => {
    ensureMain();
    ensureProc();
  }, [ensureMain, ensureProc]);

  useEffect(() => {
    const mainAudio = ensureMain();
    const procAudio = ensureProc();

    const mode: AudioMode = isProcessing ? 'proc' : (isPlaying ? 'main' : 'none');
    const prevMode = prevModeRef.current;
    const targetMain = muted ? 0 : MAIN_VOL;
    const targetProc = muted ? 0 : PROC_VOL;

    mainAudio.muted = muted;
    procAudio.muted = muted;

    transitionIdRef.current += 1;
    const transitionId = transitionIdRef.current;

    const isCurrentTransition = () => transitionId === transitionIdRef.current;

    const stopMain = (onDone?: () => void) => {
      if (mainAudio.paused || mainAudio.volume <= 0.001) {
        mainAudio.pause();
        mainAudio.currentTime = 0;
        mainAudio.volume = 0;
        onDone?.();
        return;
      }

      fadeAudio(mainAudio, 0, mainFadeRef, () => {
        if (!isCurrentTransition()) return;
        mainAudio.pause();
        mainAudio.currentTime = 0;
        mainAudio.volume = 0;
        onDone?.();
      });
    };

    const stopProc = (onDone?: () => void) => {
      if (procAudio.paused || procAudio.volume <= 0.001) {
        procAudio.pause();
        procAudio.volume = 0;
        onDone?.();
        return;
      }

      fadeAudio(procAudio, 0, procFadeRef, () => {
        if (!isCurrentTransition()) return;
        procAudio.pause();
        procAudio.volume = 0;
        onDone?.();
      });
    };

    const startMain = () => {
      if (!isCurrentTransition()) return;
      if (mainAudio.paused) {
        mainAudio.currentTime = 0;
        mainAudio.volume = 0;
        playWithUnlock(mainAudio, () => {
          if (!isCurrentTransition()) return;
          fadeAudio(mainAudio, targetMain, mainFadeRef);
        });
      } else {
        fadeAudio(mainAudio, targetMain, mainFadeRef);
      }
    };

    const startProc = (resetStartPoint: boolean) => {
      if (!isCurrentTransition()) return;
      if (resetStartPoint) {
        procAudio.currentTime = PROC_START;
      }

      if (procAudio.paused) {
        procAudio.volume = 0;
        playWithUnlock(procAudio, () => {
          if (!isCurrentTransition()) return;
          fadeAudio(procAudio, targetProc, procFadeRef);
        });
      } else {
        fadeAudio(procAudio, targetProc, procFadeRef);
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
  }, [isPlaying, isProcessing, muted, PROC_VOL, MAIN_VOL, PROC_START, ensureMain, ensureProc, fadeAudio, playWithUnlock, clearFade]);

  useEffect(() => {
    return () => {
      clearFade(mainFadeRef);
      clearFade(procFadeRef);
      mainAudioRef.current?.pause();
      procAudioRef.current?.pause();
      mainAudioRef.current = null;
      procAudioRef.current = null;
      prevModeRef.current = 'none';
    };
  }, [clearFade]);

  const handleToggleMute = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setMuted((prev) => !prev);
  }, []);

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
