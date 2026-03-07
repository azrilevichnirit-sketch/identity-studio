import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  /** Whether the game is in a phase where music should play */
  isPlaying: boolean;
}

/**
 * AudioManager - plays background music in a loop during gameplay with mute toggle.
 */
export function AudioManager({ isPlaying }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio('/audio/bg-music.mp3');
      audio.loop = true;
      audio.volume = 0.3;
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    if (isPlaying && !muted) {
      audio.play().catch(() => {
        const unlock = () => {
          if (!muted) audio.play().catch(() => {});
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
      });
    } else {
      audio.pause();
      if (!isPlaying) audio.currentTime = 0;
    }
  }, [isPlaying, muted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!isPlaying) return null;

  return (
    <button
      onClick={() => setMuted((m) => !m)}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      className="fixed top-4 left-4 z-50 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/60 transition-all"
    >
      {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
    </button>
  );
}
