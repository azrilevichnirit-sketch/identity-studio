import { useCallback, useEffect, useRef, useState } from 'react';
import { createProceduralMusic } from '@/lib/proceduralMusic';

/**
 * AudioManager - floating mute/unmute button for background music.
 * Music starts on first user interaction (browser autoplay policy).
 */
export function AudioManager() {
  const engineRef = useRef<ReturnType<typeof createProceduralMusic> | null>(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  // Create engine once
  useEffect(() => {
    engineRef.current = createProceduralMusic();
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Start music on first user interaction anywhere on the page
  useEffect(() => {
    if (started) return;

    const startMusic = () => {
      if (!started && engineRef.current) {
        engineRef.current.start();
        setStarted(true);
      }
    };

    // Listen for any interaction
    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('touchstart', startMusic, { once: true });

    return () => {
      document.removeEventListener('click', startMusic);
      document.removeEventListener('touchstart', startMusic);
    };
  }, [started]);

  const toggleMute = useCallback(() => {
    if (!engineRef.current) return;

    if (muted) {
      engineRef.current.setVolume(1);
      if (!started) {
        engineRef.current.start();
        setStarted(true);
      }
    } else {
      engineRef.current.setVolume(0);
    }
    setMuted(prev => !prev);
  }, [muted, started]);

  return (
    <button
      onClick={toggleMute}
      className="fixed top-3 right-3 z-[9999] w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white text-lg flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity border border-white/20"
      title={muted ? 'הפעל מוזיקה' : 'השתק מוזיקה'}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
    >
      {muted ? '🔇' : '🎵'}
    </button>
  );
}
