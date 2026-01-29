import { useEffect, useRef, useState } from 'react';

interface GameStageProps {
  children: React.ReactNode;
}

// Responsive stage - portrait-first on mobile, landscape on desktop
const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 720;
const MOBILE_BREAKPOINT = 768;

export function GameStage({ children }: GameStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: '100%', height: '100%', scale: 1 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const calculateLayout = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw <= MOBILE_BREAKPOINT;
      setIsMobile(mobile);

      if (mobile) {
        // Mobile: full viewport, no scaling, portrait-first
        setDimensions({
          width: '100%',
          height: '100%',
          scale: 1,
        });
      } else {
        // Desktop: scale the 16:9 stage to fit
        const aspectRatio = DESKTOP_WIDTH / DESKTOP_HEIGHT;
        const containerAspect = vw / vh;
        
        let scale: number;
        if (containerAspect > aspectRatio) {
          scale = vh / DESKTOP_HEIGHT;
        } else {
          scale = vw / DESKTOP_WIDTH;
        }
        
        setDimensions({
          width: `${DESKTOP_WIDTH}px`,
          height: `${DESKTOP_HEIGHT}px`,
          scale: Math.min(scale, 1.2), // Cap scaling to avoid extreme stretch
        });
      }
    };

    calculateLayout();
    window.addEventListener('resize', calculateLayout);
    window.addEventListener('orientationchange', calculateLayout);

    return () => {
      window.removeEventListener('resize', calculateLayout);
      window.removeEventListener('orientationchange', calculateLayout);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center bg-background overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div
        className="relative overflow-hidden"
        style={isMobile ? {
          width: '100%',
          height: '100%',
        } : {
          width: dimensions.width,
          height: dimensions.height,
          transform: `scale(${dimensions.scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}