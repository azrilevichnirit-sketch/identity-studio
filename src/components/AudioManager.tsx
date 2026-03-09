import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  isPlaying: boolean;
  isProcessing?: boolean;
}

export function AudioManager({ isPlaying, isProcessing = false }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processingAudioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Main background music
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
      // Fade out smoothly if transitioning to processing
      if (isProcessing && !muted && audio.volume > 0) {
        let vol = audio.volume;
        const fade = setInterval(() => {
          vol = Math.max(0, vol - 0.02);
          audio.volume = vol;
          if (vol <= 0) {
            clearInterval(fade);
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 0.3;
          }
        }, 30);
        return () => clearInterval(fade);
      }
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
  }, [isPlaying, muted, isProcessing]);

  // Processing music - starts at 21s with fade in
  useEffect(() => {
    if (!isProcessing) {
      // Fade out and stop processing music
      const pAudio = processingAudioRef.current;
      if (pAudio) {
        let vol = pAudio.volume;
        const fade = setInterval(() => {
          vol = Math.max(0, vol - 0.02);
          try { pAudio.volume = vol; } catch {}
          if (vol <= 0) {
            clearInterval(fade);
            pAudio.pause();
          }
        }, 30);
        return () => clearInterval(fade);
      }
      return;
    }

    if (muted) return;

    if (!processingAudioRef.current) {
      const audio = new Audio('/audio/processing-music.mp3');
      audio.loop = true;
      audio.volume = 0;
      audio.currentTime = 21;
      processingAudioRef.current = audio;
    }

    const pAudio = processingAudioRef.current;
    pAudio.currentTime = 21;
    pAudio.volume = 0;
    pAudio.muted = muted;

    // Handle looping back to 21s instead of 0
    const handleTimeUpdate = () => {
      if (pAudio.currentTime >= pAudio.duration - 0.5) {
        pAudio.currentTime = 21;
      }
    };
    pAudio.addEventListener('timeupdate', handleTimeUpdate);

    pAudio.play().then(() => {
      // Fade in smoothly
      let vol = 0;
      const fade = setInterval(() => {
        vol = Math.min(0.3, vol + 0.01);
        pAudio.volume = vol;
        if (vol >= 0.3) clearInterval(fade);
      }, 30);
    }).catch(() => {
      const unlock = () => {
        if (!mutedRef.current && processingAudioRef.current) {
          processingAudioRef.current.play().catch(() => {});
        }
        document.removeEventListener('click', unlock);
      };
      document.addEventListener('click', unlock, { once: true });
    });

    return () => {
      pAudio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isProcessing, muted]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (processingAudioRef.current) {
        processingAudioRef.current.pause();
        processingAudioRef.current = null;
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
      {muted ? <VolumeX className="text-white/80 w-3.5 h-3.5 md:w-[18px] md:h-[18px]" /> : <Volume2 className="text-white/80 w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />}
    </button>
  );
}
