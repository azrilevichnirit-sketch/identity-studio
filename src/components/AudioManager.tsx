import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  isPlaying: boolean;
  isProcessing?: boolean;
}

export function AudioManager({ isPlaying, isProcessing = false }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const procAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const isProcessingRef = useRef(isProcessing);

  const PROC_START = 21;
  const PROC_VOLUME = 0.08; // Very soft during processing

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  // === Main background music — plays during gameplay AND continues softly into processing ===
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio('/audio/bg-music.mp3');
      audio.loop = true;
      audio.volume = 0.3;
      audio.muted = muted;
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    audio.muted = muted;

    // Clear any ongoing fade
    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }

    const shouldStop = !isPlaying && !isProcessing;

    if (shouldStop) {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.3;
      return;
    }

    if (muted) {
      audio.pause();
      return;
    }

    // If processing: fade down to very soft
    if (isProcessing) {
      const targetVol = PROC_VOLUME;
      if (audio.paused) {
        // Already playing from gameplay — shouldn't be paused, but just in case
        audio.volume = targetVol;
        audio.play().catch(() => {});
      } else {
        // Smooth fade down
        fadeRef.current = window.setInterval(() => {
          const newVol = Math.max(targetVol, audio.volume - 0.015);
          audio.volume = newVol;
          if (newVol <= targetVol) {
            if (fadeRef.current) clearInterval(fadeRef.current);
            fadeRef.current = null;
          }
        }, 30);
      }
      return;
    }

    // Normal gameplay: fade up to full volume
    if (!audio.paused && audio.volume < 0.3) {
      fadeRef.current = window.setInterval(() => {
        const newVol = Math.min(0.3, audio.volume + 0.015);
        audio.volume = newVol;
        if (newVol >= 0.3) {
          if (fadeRef.current) clearInterval(fadeRef.current);
          fadeRef.current = null;
        }
      }, 30);
    } else {
      audio.volume = 0.3;
    }

    if (audio.paused) {
      audio.play().catch(() => {
        const unlock = () => {
          if (!mutedRef.current && isPlayingRef.current && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
      });
    }

    return () => {
      if (fadeRef.current) {
        clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
    };
  }, [isPlaying, muted, isProcessing]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (fadeRef.current) {
        clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
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
