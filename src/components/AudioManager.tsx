import { useCallback, useEffect, useRef, useState } from 'react';

const MUSIC_STORAGE_KEY = 'identity_game_music_blob';

/**
 * AudioManager - floating mute/unmute button for background music.
 * Fetches AI-generated music from ElevenLabs on first play,
 * caches it in memory, and loops it as game background music.
 * Falls back to silence if generation fails.
 */
export function AudioManager() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const fetchAndPlayMusic = useCallback(async () => {
    if (loading || blobUrlRef.current) return;
    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-music`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt: "Upbeat lo-fi hip hop instrumental beat. Warm jazzy piano chords, vinyl crackle, punchy kick and snare, groovy bassline, catchy melodic hooks. Energetic and fun for a game, appealing to people in their 20s. Head-nodding groove that keeps you focused and engaged. No vocals.",
            duration: 120,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Music fetch failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0.3;
      audioRef.current = audio;
      await audio.play();
      setStarted(true);
    } catch (err) {
      console.error('Failed to generate music:', err);
      // Silently fail - game works without music
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Start music on first user interaction
  useEffect(() => {
    if (started) return;

    const startMusic = () => {
      if (!started) {
        fetchAndPlayMusic();
      }
    };

    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('touchstart', startMusic, { once: true });

    return () => {
      document.removeEventListener('click', startMusic);
      document.removeEventListener('touchstart', startMusic);
    };
  }, [started, fetchAndPlayMusic]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (muted) {
        audioRef.current.volume = 0.3;
      } else {
        audioRef.current.volume = 0;
      }
    } else if (muted && !started) {
      // If not started yet, try to start
      fetchAndPlayMusic();
    }
    setMuted(prev => !prev);
  }, [muted, started, fetchAndPlayMusic]);

  return (
    <button
      onClick={toggleMute}
      className="fixed top-3 right-3 z-[9999] w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white text-lg flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity border border-white/20"
      title={muted ? 'הפעל מוזיקה' : 'השתק מוזיקה'}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
    >
      {loading ? '⏳' : muted ? '🔇' : '🎵'}
    </button>
  );
}
