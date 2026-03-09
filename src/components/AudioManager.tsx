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

  const MAIN_VOL = 0.3;
  const PROC_VOL = softVolume ?? 0.3;
  const PROC_START = 21;
  const FADE_STEP = 0.008; // Slow smooth fade
  const FADE_INTERVAL = 25; // ~1.5s total fade

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  // Helper: fade an audio element to a target volume
  const fadeAudio = useCallback((
    audio: HTMLAudioElement,
    target: number,
    fadeTimerRef: React.MutableRefObject<number | null>,
    onDone?: () => void
  ) => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    fadeTimerRef.current = window.setInterval(() => {
      const current = audio.volume;
      const diff = target - current;
      if (Math.abs(diff) < FADE_STEP + 0.001) {
        audio.volume = target;
        if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        onDone?.();
      } else {
        audio.volume = current + (diff > 0 ? FADE_STEP : -FADE_STEP);
      }
    }, FADE_INTERVAL);
  }, []);

  // Ensure processing audio element exists
  const ensureProc = useCallback(() => {
    if (!procAudioRef.current) {
      const audio = new Audio('/audio/processing-music.mp3');
      audio.volume = 0;
      audio.loop = false;
      audio.preload = 'auto';
      procAudioRef.current = audio;
      // Custom loop back to start point
      audio.addEventListener('ended', () => {
        audio.currentTime = PROC_START;
        audio.play().catch(() => {});
      });
    }
    return procAudioRef.current;
  }, []);

  // === Main background music ===
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio('/audio/bg-music.mp3');
      audio.loop = true;
      audio.volume = MAIN_VOL;
      audio.muted = muted;
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    audio.muted = muted;

    // Should main music be audible?
    const wantMain = isPlaying && !isProcessing;

    if (wantMain) {
      audio.muted = muted;
      if (audio.paused) {
        audio.volume = 0;
        audio.play().catch(() => {
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
        fadeAudio(audio, MAIN_VOL, mainFadeRef);
      } else {
        audio.volume = 0;
      }
    } else {
      // Fade out, then pause
      if (!audio.paused) {
        fadeAudio(audio, 0, mainFadeRef, () => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = MAIN_VOL;
        });
      }
    }

    return () => {
      if (mainFadeRef.current) {
        clearInterval(mainFadeRef.current);
        mainFadeRef.current = null;
      }
    };
  }, [isPlaying, muted, isProcessing, fadeAudio]);

  useEffect(() => {
    const wantProc = isProcessing;

    const startProcessingTrack = () => {
      const pAudio = ensureProc();
      pAudio.muted = muted;

      if (pAudio.paused) {
        pAudio.currentTime = PROC_START;
        pAudio.volume = 0;
        pAudio.play().catch(() => {
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
      }

      if (!muted) {
        fadeAudio(pAudio, PROC_VOL, procFadeRef);
      } else {
        pAudio.volume = 0;
      }
    };

    if (wantProc) {
      const mainAudio = audioRef.current;

      // Prevent overlap: only start processing track after main track fully fades out
      if (mainAudio && !mainAudio.paused && mainAudio.volume > 0.001) {
        fadeAudio(mainAudio, 0, mainFadeRef, () => {
          mainAudio.pause();
          mainAudio.currentTime = 0;
          mainAudio.volume = MAIN_VOL;
          startProcessingTrack();
        });
      } else {
        startProcessingTrack();
      }
    } else {
      const pAudio = procAudioRef.current;
      if (pAudio && !pAudio.paused) {
        fadeAudio(pAudio, 0, procFadeRef, () => {
          pAudio.pause();
        });
      }
    }

    return () => {
      if (procFadeRef.current) {
        clearInterval(procFadeRef.current);
        procFadeRef.current = null;
      }
    };
  }, [isProcessing, muted, ensureProc, fadeAudio, PROC_VOL]);

  // Cleanup
  useEffect(() => {
    return () => {
      [mainFadeRef, procFadeRef].forEach(ref => {
        if (ref.current) { clearInterval(ref.current); ref.current = null; }
      });
      audioRef.current?.pause();
      procAudioRef.current?.pause();
      audioRef.current = null;
      procAudioRef.current = null;
    };
  }, []);

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
