import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  isPlaying: boolean;
}

export function AudioManager({ isPlaying }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

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
        // Autoplay blocked — unlock on next user gesture
        const unlock = () => {
          if (!mutedRef.current && audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger unlock listener
    setMuted((m) => !m);
  }, []);

  if (!isPlaying) return null;

  return (
    <button
      onClick={handleToggle}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      className="fixed top-3 left-3 z-[9999] w-10 h-10 flex items-center justify-center rounded-full shadow-lg transition-all active:scale-90"
      style={{
        background: 'radial-gradient(circle at 30% 30%, #4a4a4a, #1a1a1a)',
        border: '2px solid rgba(255,255,255,0.15)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {muted ? (
        <VolumeX size={18} className="text-red-400 drop-shadow-sm" />
      ) : (
        <Volume2 size={18} className="text-white/90 drop-shadow-sm" />
      )}
    </button>
  );
}
