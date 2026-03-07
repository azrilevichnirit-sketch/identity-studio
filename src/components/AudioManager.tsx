import { useEffect, useRef } from 'react';

interface AudioManagerProps {
  /** Whether the game is in a phase where music should play */
  isPlaying: boolean;
}

/**
 * AudioManager - plays background music in a loop during gameplay.
 */
export function AudioManager({ isPlaying }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio('/audio/bg-music.mp3');
      audio.loop = true;
      audio.volume = 0.3;
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    if (isPlaying) {
      audio.play().catch(() => {
        // Autoplay blocked — will start on next user interaction
        const unlock = () => {
          audio.play().catch(() => {});
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }

    return () => {
      // cleanup only on unmount
    };
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return null;
}
