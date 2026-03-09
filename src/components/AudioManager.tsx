import { forwardRef, useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
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
  { isPlaying, isProcessing = false, softVolume },
  ref
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const transitionIdRef = useRef(0);
  const currentModeRef = useRef<AudioMode>('none');
  const currentSrcRef = useRef<string | null>(null);

  const [muted, setMuted] = useState(false);

  const clearFade = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const fadeTo = useCallback((audio: HTMLAudioElement, target: number, onDone?: () => void) => {
    clearFade();

    fadeTimerRef.current = window.setInterval(() => {
      const current = audio.volume;
      const diff = target - current;

      if (Math.abs(diff) <= FADE_STEP + 0.001) {
        audio.volume = target;
        clearFade();
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
    const audio = new Audio(MAIN_SRC);
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = 0;

    const handleEnded = () => {
      if (currentModeRef.current !== 'proc') return;
      audio.currentTime = PROC_START;
      audio.play().catch(() => {});
    };

    audio.addEventListener('ended', handleEnded);
    audioRef.current = audio;
    currentSrcRef.current = MAIN_SRC;

    return () => {
      clearFade();
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
      currentSrcRef.current = null;
      currentModeRef.current = 'none';
    };
  }, [clearFade]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const mode: AudioMode = isProcessing ? 'proc' : (isPlaying ? 'main' : 'none');
    const procTargetVol = softVolume ?? 0.3;
    const targetVolume = muted ? 0 : mode === 'main' ? MAIN_VOL : procTargetVol;

    audio.muted = muted;

    transitionIdRef.current += 1;
    const transitionId = transitionIdRef.current;
    const isCurrentTransition = () => transitionId === transitionIdRef.current;

    const desiredSrc = mode === 'main' ? MAIN_SRC : mode === 'proc' ? PROC_SRC : null;
    const desiredLoop = mode === 'main';

    const startTrack = (resetPosition: boolean) => {
      if (!isCurrentTransition() || !desiredSrc) return;

      const shouldSwapSrc = currentSrcRef.current !== desiredSrc;
      if (shouldSwapSrc) {
        audio.pause();
        audio.src = desiredSrc;
        audio.load();
        currentSrcRef.current = desiredSrc;
        audio.volume = 0;
      }

      audio.loop = desiredLoop;

      if (resetPosition || shouldSwapSrc) {
        if (mode === 'main') {
          audio.currentTime = 0;
        } else {
          if (audio.readyState >= 1) {
            audio.currentTime = PROC_START;
          } else {
            const seekToProcStart = () => {
              audio.currentTime = PROC_START;
              audio.removeEventListener('loadedmetadata', seekToProcStart);
            };
            audio.addEventListener('loadedmetadata', seekToProcStart, { once: true });
          }
        }
      }

      const afterPlay = () => {
        if (!isCurrentTransition()) return;
        fadeTo(audio, targetVolume);
      };

      if (audio.paused) {
        playWithUnlock(audio, afterPlay);
      } else {
        afterPlay();
      }
    };

    if (mode === 'none') {
      fadeTo(audio, 0, () => {
        if (!isCurrentTransition()) return;
        audio.pause();
      });
      currentModeRef.current = 'none';
      return () => clearFade();
    }

    const previousMode = currentModeRef.current;
    const shouldResetPosition = previousMode !== mode;
    const shouldSwapSrc = desiredSrc !== currentSrcRef.current;

    if (shouldSwapSrc && !audio.paused && audio.volume > 0.001) {
      fadeTo(audio, 0, () => {
        if (!isCurrentTransition()) return;
        audio.pause();
        startTrack(true);
      });
    } else {
      startTrack(shouldResetPosition);
    }

    currentModeRef.current = mode;

    return () => clearFade();
  }, [isPlaying, isProcessing, muted, softVolume, fadeTo, playWithUnlock, clearFade]);

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
