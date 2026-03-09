import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  isPlaying: boolean;
  isProcessing?: boolean;
}

export function AudioManager({ isPlaying, isProcessing = false }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const procAudioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const isProcessingRef = useRef(isProcessing);

  const PROC_START = 21;

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  // === Main background music (original working logic) ===
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

    if (!isPlaying || isProcessing) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    if (muted) {
      audio.pause();
      return;
    }

    audio.play().catch(() => {
      const unlock = () => {
        if (!mutedRef.current && isPlayingRef.current && !isProcessingRef.current && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
      };
      document.addEventListener('click', unlock, { once: true });
      document.addEventListener('touchstart', unlock, { once: true });
    });
  }, [isPlaying, muted, isProcessing]);

  // === Processing music (lead form + processing screen) ===
  useEffect(() => {
    if (!isProcessing) {
      // Stop processing music
      const pAudio = procAudioRef.current;
      if (pAudio && !pAudio.paused) {
        pAudio.pause();
      }
      return;
    }

    if (muted) {
      if (procAudioRef.current && !procAudioRef.current.paused) {
        procAudioRef.current.pause();
      }
      return;
    }

    if (!procAudioRef.current) {
      const audio = new Audio('/audio/processing-music.mp3');
      audio.volume = 0.3;
      audio.loop = false;
      procAudioRef.current = audio;

      // Custom loop back to 21s
      audio.addEventListener('ended', () => {
        audio.currentTime = PROC_START;
        audio.play().catch(() => {});
      });
    }

    const pAudio = procAudioRef.current;
    pAudio.muted = muted;

    if (pAudio.paused) {
      pAudio.currentTime = PROC_START;
      pAudio.volume = 0.3;
      pAudio.play().catch(() => {
        const unlock = () => {
          if (!mutedRef.current && isProcessingRef.current && procAudioRef.current) {
            procAudioRef.current.currentTime = PROC_START;
            procAudioRef.current.play().catch(() => {});
          }
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
      });
    }
  }, [isProcessing, muted]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (procAudioRef.current) {
        procAudioRef.current.pause();
        procAudioRef.current = null;
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
