import { useEffect, useRef, useState, useCallback, type MouseEvent } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioManagerProps {
  isPlaying: boolean;
  isProcessing?: boolean;
  softVolume?: number;
}

type TrackMode = 'main' | 'proc';

export function AudioManager({ isPlaying, isProcessing = false, softVolume }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const transitionIdRef = useRef(0);
  const activeTrackRef = useRef<TrackMode | null>(null);

  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  const MAIN_VOL = 0.3;
  const PROC_VOL = softVolume ?? 0.3;
  const PROC_START = 21;
  const FADE_STEP = 0.008;
  const FADE_INTERVAL = 25;

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const clearFade = useCallback(() => {
    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio('/audio/bg-music.mp3');
      audio.preload = 'auto';
      audio.loop = true;
      audio.volume = 0;
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const fadeTo = useCallback((audio: HTMLAudioElement, target: number, onDone?: () => void) => {
    clearFade();

    fadeRef.current = window.setInterval(() => {
      const diff = target - audio.volume;
      if (Math.abs(diff) <= FADE_STEP + 0.001) {
        audio.volume = target;
        clearFade();
        onDone?.();
        return;
      }
      audio.volume = audio.volume + (diff > 0 ? FADE_STEP : -FADE_STEP);
    }, FADE_INTERVAL);
  }, [clearFade]);

  const playWithUnlock = useCallback((audio: HTMLAudioElement, onStarted?: () => void) => {
    audio.play().then(() => {
      onStarted?.();
    }).catch(() => {
      const unlock = () => {
        audio.play().then(() => {
          onStarted?.();
        }).catch(() => {});
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
      };
      document.addEventListener('click', unlock, { once: true });
      document.addEventListener('touchstart', unlock, { once: true });
    });
  }, []);

  const configureTrack = useCallback((audio: HTMLAudioElement, mode: TrackMode) => {
    if (mode === 'main') {
      if (!audio.src.endsWith('/audio/bg-music.mp3')) {
        audio.src = '/audio/bg-music.mp3';
      }
      audio.loop = true;
      audio.onended = null;
      audio.currentTime = 0;
      return;
    }

    if (!audio.src.endsWith('/audio/processing-music.mp3')) {
      audio.src = '/audio/processing-music.mp3';
    }
    audio.loop = false;
    audio.onended = () => {
      if (activeTrackRef.current !== 'proc') return;
      audio.currentTime = PROC_START;
      audio.play().catch(() => {});
    };
    audio.currentTime = PROC_START;
  }, [PROC_START]);

  useEffect(() => {
    const audio = ensureAudio();
    audio.muted = muted;

    const desiredTrack: TrackMode | null = isProcessing ? 'proc' : (isPlaying ? 'main' : null);
    const desiredVolume = muted ? 0 : (desiredTrack === 'proc' ? PROC_VOL : MAIN_VOL);

    transitionIdRef.current += 1;
    const transitionId = transitionIdRef.current;

    if (!desiredTrack) {
      if (!audio.paused) {
        fadeTo(audio, 0, () => {
          if (transitionId !== transitionIdRef.current) return;
          audio.pause();
          audio.currentTime = 0;
          activeTrackRef.current = null;
        });
      }
      return;
    }

    const startDesiredTrack = () => {
      if (transitionId !== transitionIdRef.current) return;

      configureTrack(audio, desiredTrack);
      activeTrackRef.current = desiredTrack;

      audio.volume = 0;
      playWithUnlock(audio, () => {
        if (transitionId !== transitionIdRef.current) return;
        fadeTo(audio, desiredVolume);
      });
    };

    if (activeTrackRef.current === desiredTrack) {
      if (audio.paused) {
        playWithUnlock(audio, () => {
          if (transitionId !== transitionIdRef.current) return;
          fadeTo(audio, desiredVolume);
        });
      } else {
        fadeTo(audio, desiredVolume);
      }
      return;
    }

    // Switching tracks (main <-> proc): smooth fade out -> swap -> fade in
    if (!audio.paused && audio.volume > 0.001) {
      fadeTo(audio, 0, () => {
        if (transitionId !== transitionIdRef.current) return;
        audio.pause();
        startDesiredTrack();
      });
    } else {
      audio.pause();
      startDesiredTrack();
    }
  }, [isPlaying, isProcessing, muted, PROC_VOL, MAIN_VOL, ensureAudio, fadeTo, playWithUnlock, configureTrack]);

  useEffect(() => {
    return () => {
      clearFade();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
      }
      audioRef.current = null;
      activeTrackRef.current = null;
    };
  }, [clearFade]);

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
