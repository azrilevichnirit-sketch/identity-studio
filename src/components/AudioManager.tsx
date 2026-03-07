import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  isPlaying: boolean;
}

export function AudioManager({ isPlaying }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

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

    if (!isPlaying) {
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
        if (!mutedRef.current && isPlayingRef.current && audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
        document.removeEventListener('click', unlock);
      };

      document.addEventListener('click', unlock, { once: true });
    });
  }, [isPlaying, muted]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleToggleMute = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setMuted((prev) => !prev);
  }, []);

  if (!isPlaying) return null;

  return (
    <button
      type="button"
      onClick={handleToggleMute}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      className="fixed top-3 left-3 z-[9999] inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-gradient-to-b from-muted to-card text-foreground shadow-lg transition-transform active:scale-95"
    >
      {muted ? <VolumeX size={18} className="text-destructive" /> : <Volume2 size={18} />}
    </button>
  );
}
