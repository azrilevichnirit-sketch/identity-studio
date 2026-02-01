import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * Blocks portrait orientation on mobile devices.
 * Shows a full-screen overlay asking the user to rotate their device to landscape.
 * The game is designed for landscape mode only on mobile.
 */
export function LandscapeBlocker() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if it's a mobile device (touch + small screen)
      const isMobileDevice = 'ontouchstart' in window && window.innerWidth < 1024;
      setIsMobile(isMobileDevice);

      // Check if portrait (height > width) on mobile - we want landscape only
      if (isMobileDevice) {
        const isPortraitMode = window.innerHeight > window.innerWidth;
        setIsPortrait(isPortraitMode);
      } else {
        setIsPortrait(false);
      }
    };

    // Initial check
    checkOrientation();

    // Listen for orientation/resize changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isMobile || !isPortrait) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {/* Phone icon rotating from portrait to landscape */}
      <div 
        className="relative"
        style={{
          animation: 'rotate-phone 2s ease-in-out infinite',
        }}
      >
        <div 
          className="w-20 h-32 rounded-xl border-4 border-white/80 bg-white/10 flex items-center justify-center"
          style={{
            boxShadow: '0 0 30px rgba(255,255,255,0.2)',
          }}
        >
          <div className="w-8 h-8 rounded-full border-2 border-white/60" />
        </div>
      </div>

      {/* Arrow indicating rotation */}
      <RotateCcw 
        className="w-12 h-12 text-white/80"
        style={{
          animation: 'pulse-rotate 1.5s ease-in-out infinite',
        }}
      />

      {/* Text */}
      <div className="text-center space-y-2" dir="rtl">
        <h2 
          className="text-2xl font-bold text-white"
          style={{
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          סובבו את המכשיר לרוחב
        </h2>
        <p className="text-white/70 text-lg">
          המשחק מותאם למצב רוחבי
        </p>
      </div>

      {/* Inline keyframes - phone rotates from portrait (0deg) to landscape (90deg) */}
      <style>{`
        @keyframes rotate-phone {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(90deg);
          }
        }
        @keyframes pulse-rotate {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
