import { forwardRef, useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
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
const FADE_STEP = 0.01;
const FADE_INTERVAL = 20;

export const AudioManager = forwardRef<HTMLButtonElement, AudioManagerProps>(function AudioManager(
  { phase, isPlaying, isProcessing = false, softVolume },
  ref
) {
  const mainAudioRef = useRef<HTMLAudioElement | null>(null);
  const procAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const unlockedRef = useRef(false);
  const modeRef = useRef<AudioMode>('none');

  const [muted, setMuted] = useState(false);

  const isProcessingPhase = phase === 'lead' || phase === 'processing' || phase === 'summary';

  const clearFade = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const fadeVolumes = useCallback((mainTarget: number, procTarget: number) => {
    const main = mainAudioRef.current;
    const proc = procAudioRef.current;
    if (!main || !proc) return;

    clearFade();

    fadeTimerRef.current = window.setInterval(() => {
      const mainDiff = mainTarget - main.volume;
      const procDiff = procTarget - proc.volume;

      const mainDone = Math.abs(mainDiff) <= FADE_STEP + 0.001;
      const procDone = Math.abs(procDiff) <= FADE_STEP + 0.001;

      if (mainDone) {
        main.volume = mainTarget;
      } else {
        main.volume = main.volume + (mainDiff > 0 ? FADE_STEP : -FADE_STEP);
      }

      if (procDone) {
        proc.volume = procTarget;
      } else {
        proc.volume = proc.volume + (procDiff > 0 ? FADE_STEP : -FADE_STEP);
      }

      if (mainDone && procDone) {
        clearFade();
      }
    }, FADE_INTERVAL);
  }, [clearFade]);

  const keepPlaying = useCallback(() => {
    const main = mainAudioRef.current;
    const proc = procAudioRef.current;
    if (!main || !proc || !unlockedRef.current) return;

    if (main.paused) {
      main.play().catch(() => {});
    }
    if (proc.paused) {
      proc.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const main = new Audio(MAIN_SRC);
    main.preload = 'auto';
    main.loop = true;
    main.volume = 0;

    const proc = new Audio(PROC_SRC);
    proc.preload = 'auto';
    proc.loop = false;
    proc.volume = 0;

    const handleProcEnded = () => {
      proc.currentTime = PROC_START;
      proc.play().catch(() => {});
    };

    proc.addEventListener('ended', handleProcEnded);

    mainAudioRef.current = main;
    procAudioRef.current = proc;

    const unlockAndPrime = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;

      main.play().catch(() => {});
      if (proc.readyState >= 1) {
        proc.currentTime = PROC_START;
      }
      proc.play().catch(() => {});
    };

    document.addEventListener('click', unlockAndPrime, { passive: true });
    document.addEventListener('touchstart', unlockAndPrime, { passive: true });

    return () => {
      document.removeEventListener('click', unlockAndPrime);
      document.removeEventListener('touchstart', unlockAndPrime);
      clearFade();
      main.pause();
      proc.pause();
      proc.removeEventListener('ended', handleProcEnded);
      mainAudioRef.current = null;
      procAudioRef.current = null;
      unlockedRef.current = false;
      modeRef.current = 'none';
    };
  }, [clearFade]);

  useEffect(() => {
    const main = mainAudioRef.current;
    const proc = procAudioRef.current;
    if (!main || !proc) return;

    const mode: AudioMode = isProcessing ? 'proc' : (isPlaying ? 'main' : 'none');
    const procTargetVol = softVolume ?? 0.3;

    main.muted = muted;
    proc.muted = muted;

    if (modeRef.current !== 'proc' && mode === 'proc') {
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

    keepPlaying();

    const mainTarget = muted ? 0 : mode === 'main' ? MAIN_VOL : 0;
    const procTarget = muted ? 0 : mode === 'proc' ? procTargetVol : 0;
    fadeVolumes(mainTarget, procTarget);

    modeRef.current = mode;

    return () => clearFade();
  }, [isPlaying, isProcessing, muted, softVolume, fadeVolumes, keepPlaying, clearFade]);

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
