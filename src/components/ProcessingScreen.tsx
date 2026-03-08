import { useEffect, useState } from 'react';
import galleryBg from '@/assets/backgrounds/gallery_main_stylized.webp';

interface ProcessingScreenProps {
  estimatedTimeMs?: number;
}

const LOADING_MESSAGES = [
  'מנתחים את הפרופיל שלך...',
  'מזהים דפוסים ייחודיים...',
  'מחברים את הנקודות...',
  'בונים את המפה שלך...',
  'כמעט שם...',
];

export function ProcessingScreen({ estimatedTimeMs = 5000 }: ProcessingScreenProps) {
  const [progress, setProgress] = useState(15);
  const [messageIndex, setMessageIndex] = useState(0);
  const [particleKey, setParticleKey] = useState(0);

  // Progress animation
  useEffect(() => {
    const startTime = Date.now();
    let rafId: number;
    let cancelled = false;

    const animate = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;
      const phase1End = estimatedTimeMs;
      const phase2Duration = 60000;

      let rawProgress: number;
      if (elapsed <= phase1End) {
        rawProgress = (elapsed / phase1End) * 0.85;
      } else {
        const phase2Elapsed = elapsed - phase1End;
        rawProgress = 0.85 + Math.min(phase2Elapsed / phase2Duration, 1) * 0.13;
      }

      const easedProgress = 0.15 + (1 - Math.pow(1 - rawProgress, 3)) * 0.80;
      setProgress(easedProgress * 100);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => { cancelled = true; cancelAnimationFrame(rafId); };
  }, [estimatedTimeMs]);

  // Rotating messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Particle regeneration
  useEffect(() => {
    const interval = setInterval(() => setParticleKey((k) => k + 1), 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="game-stage flex items-center justify-center"
      style={{
        backgroundImage: `url(${galleryBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        filter: 'saturate(1.18) contrast(1.08)',
      }}
    >
      {/* Dark overlay with subtle gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(10,20,40,0.65) 100%)',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" key={particleKey}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${3 + Math.random() * 5}px`,
              height: `${3 + Math.random() * 5}px`,
              left: `${10 + Math.random() * 80}%`,
              bottom: `-10px`,
              background: `rgba(45, 123, 229, ${0.2 + Math.random() * 0.4})`,
              animation: `floatUp ${5 + Math.random() * 6}s ease-out ${Math.random() * 3}s forwards`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center animate-fade-in">
        {/* Glass card */}
        <div
          className="p-8 md:p-10 rounded-3xl text-center"
          dir="rtl"
          style={{
            width: 'min(340px, 88vw)',
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* Animated orb */}
          <div className="relative mx-auto mb-6" style={{ width: 100, height: 100 }}>
            {/* Outer glow ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(45,123,229,0.3) 0%, transparent 70%)',
                animation: 'pulseGlow 2.5s ease-in-out infinite',
              }}
            />
            {/* Spinning ring */}
            <div
              className="absolute inset-2 rounded-full"
              style={{
                border: '3px solid transparent',
                borderTopColor: '#2D7BE5',
                borderRightColor: 'rgba(45,123,229,0.4)',
                animation: 'spin 1.8s linear infinite',
              }}
            />
            {/* Inner orb */}
            <div
              className="absolute rounded-full flex items-center justify-center"
              style={{
                inset: '12px',
                background: 'linear-gradient(135deg, #2D7BE5, #1A5FC4)',
                boxShadow: '0 4px 20px rgba(45,123,229,0.5), inset 0 2px 6px rgba(255,255,255,0.2)',
              }}
            >
              <span className="text-3xl" style={{ animation: 'orbFloat 3s ease-in-out infinite' }}>✨</span>
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-xl md:text-2xl font-bold mb-2"
            style={{ color: '#FFF', fontFamily: "'Rubik', sans-serif" }}
          >
            התוצאות מתבשלות...
          </h1>

          {/* Progress bar */}
          <div
            className="relative mx-auto rounded-full overflow-hidden my-6"
            style={{
              width: '100%',
              height: '6px',
              background: 'rgba(255,255,255,0.15)',
            }}
          >
            <div
              className="absolute inset-y-0 right-0 rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(to left, #2D7BE5, #5BA3F5)',
                boxShadow: '0 0 12px rgba(45,123,229,0.5)',
              }}
            />
          </div>

          {/* Rotating message */}
          <p
            className="text-sm transition-opacity duration-500"
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontFamily: "'Rubik', sans-serif",
              minHeight: '1.5em',
            }}
            key={messageIndex}
          >
            <span className="animate-fade-in inline-block">{LOADING_MESSAGES[messageIndex]}</span>
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
