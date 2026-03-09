import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  isPlaying: boolean;
  isProcessing?: boolean;
  softVolume?: number;
}

export function AudioManager({ isPlaying, isProcessing = false, softVolume }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const procAudioRef = useRef<HTMLAudioElement | null>(null);
  const mainFadeRef = useRef<number | null>(null);
  const procFadeRef = useRef<number | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const isProcessingRef = useRef(isProcessing);
  const prevIsProcessingRef = useRef(isProcessing);

  const MAIN_VOL = 0.3;
  const PROC_VOL = softVolume ?? 0.3;
  const PROC_START = 21;
  const FADE_STEP = 0.008;
  const FADE_INTERVAL = 25;

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  const clearFadeTimer = useCallback((ref: React.MutableRefObject<number | null>) => {
    if (ref.current) {
      clearInterval(ref.current);
      ref.current = null;
    }
  }, []);

  const fadeAudio = useCallback((
    audio: HTMLAudioElement,
    target: number,
    fadeTimerRef: React.MutableRefObject<number | null>,
    onDone?: () => void
  ) => {
    clearFadeTimer(fadeTimerRef);
    fadeTimerRef.current = window.setInterval(() => {
      const current = audio.volume;
      const diff = target - current;
      if (Math.abs(diff) < FADE_STEP + 0.001) {
        audio.volume = target;
        clearFadeTimer(fadeTimerRef);
        onDone?.();
      } else {
        audio.volume = current + (diff > 0 ? FADE_STEP : -FADE_STEP);
      }
    }, FADE_INTERVAL);
  }, [clearFadeTimer]);

  // Preload processing track
  const ensureProc = useCallback(() => {
    if (!procAudioRef.current) {
      const audio = new Audio('/audio/processing-music.mp3');
      audio.volume = 0;
      audio.loop = false;
      audio.preload = 'auto';
      procAudioRef.current = audio;
      audio.addEventListener('ended', () => {
        audio.currentTime = PROC_START;
        audio.play().catch(() => {});
      });
    }
    return procAudioRef.current;
  }, []);

  useEffect(() => { ensureProc(); }, [ensureProc]);

  // Ensure main audio element exists
  const ensureMain = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio('/audio/bg-music.mp3');
      audio.loop = true;
      audio.volume = MAIN_VOL;
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  // === Single unified music controller ===
  useEffect(() => {
    const mainAudio = ensureMain();
    const procAudio = ensureProc();
    
    mainAudio.muted = muted;
    procAudio.muted = muted;

    const justEnteredProcessing = isProcessing && !prevIsProcessingRef.current;
    const justLeftProcessing = !isProcessing && prevIsProcessingRef.current;
    prevIsProcessingRef.current = isProcessing;

    // STATE 1: Processing mode (lead / processing / summary)
    if (isProcessing) {
      // If just entered processing — crossfade from main to proc
      if (justEnteredProcessing) {
        if (!mainAudio.paused && mainAudio.volume > 0.001) {
          // Crossfade: fade out main, then start proc
          fadeAudio(mainAudio, 0, mainFadeRef, () => {
            mainAudio.pause();
            mainAudio.currentTime = 0;
            mainAudio.volume = MAIN_VOL;

            // Start processing track
            procAudio.currentTime = PROC_START;
            procAudio.volume = 0;
            procAudio.play().catch(() => {
              const unlock = () => {
                if (!mutedRef.current && isProcessingRef.current && procAudioRef.current) {
                  procAudioRef.current.currentTime = PROC_START;
                  procAudioRef.current.volume = 0;
                  procAudioRef.current.play().then(() => {
                    fadeAudio(procAudioRef.current!, PROC_VOL, procFadeRef);
                  }).catch(() => {});
                }
                document.removeEventListener('click', unlock);
                document.removeEventListener('touchstart', unlock);
              };
              document.addEventListener('click', unlock, { once: true });
              document.addEventListener('touchstart', unlock, { once: true });
            });
            if (!mutedRef.current) {
              fadeAudio(procAudio, PROC_VOL, procFadeRef);
            }
          });
        } else {
          // Main isn't playing, just start proc directly
          mainAudio.pause();
          mainAudio.currentTime = 0;
          
          procAudio.currentTime = PROC_START;
          procAudio.volume = 0;
          procAudio.play().catch(() => {
            const unlock = () => {
              if (!mutedRef.current && isProcessingRef.current && procAudioRef.current) {
                procAudioRef.current.currentTime = PROC_START;
                procAudioRef.current.volume = 0;
                procAudioRef.current.play().then(() => {
                  fadeAudio(procAudioRef.current!, PROC_VOL, procFadeRef);
                }).catch(() => {});
              }
              document.removeEventListener('click', unlock);
              document.removeEventListener('touchstart', unlock);
            };
            document.addEventListener('click', unlock, { once: true });
            document.addEventListener('touchstart', unlock, { once: true });
          });
          if (!muted) {
            fadeAudio(procAudio, PROC_VOL, procFadeRef);
          }
        }
      } else {
        // Already in processing mode — just adjust volume (e.g. lead→summary)
        if (!procAudio.paused && !muted) {
          fadeAudio(procAudio, PROC_VOL, procFadeRef);
        } else if (muted) {
          procAudio.volume = 0;
        }
      }
      return;
    }

    // STATE 2: Normal play mode (game phases)
    if (justLeftProcessing) {
      // Fade out proc track
      if (!procAudio.paused) {
        fadeAudio(procAudio, 0, procFadeRef, () => {
          procAudio.pause();
        });
      }
    }

    if (isPlaying) {
      if (mainAudio.paused) {
        mainAudio.volume = 0;
        mainAudio.play().catch(() => {
          const unlock = () => {
            if (!mutedRef.current && isPlayingRef.current && !isProcessingRef.current && audioRef.current) {
              audioRef.current.volume = 0;
              audioRef.current.play().then(() => {
                fadeAudio(audioRef.current!, MAIN_VOL, mainFadeRef);
              }).catch(() => {});
            }
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
          };
          document.addEventListener('click', unlock, { once: true });
          document.addEventListener('touchstart', unlock, { once: true });
        });
      }
      if (!muted) {
        fadeAudio(mainAudio, MAIN_VOL, mainFadeRef);
      } else {
        mainAudio.volume = 0;
      }
    } else {
      // Not playing, not processing — silence everything
      if (!mainAudio.paused) {
        fadeAudio(mainAudio, 0, mainFadeRef, () => {
          mainAudio.pause();
          mainAudio.currentTime = 0;
          mainAudio.volume = MAIN_VOL;
        });
      }
    }

    return () => {
      clearFadeTimer(mainFadeRef);
      clearFadeTimer(procFadeRef);
    };
  }, [isPlaying, isProcessing, muted, PROC_VOL, fadeAudio, ensureMain, ensureProc, clearFadeTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFadeTimer(mainFadeRef);
      clearFadeTimer(procFadeRef);
      audioRef.current?.pause();
      procAudioRef.current?.pause();
      audioRef.current = null;
      procAudioRef.current = null;
    };
  }, [clearFadeTimer]);

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
