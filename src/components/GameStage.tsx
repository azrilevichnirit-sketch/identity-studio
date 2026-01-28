import { useEffect, useRef, useState } from 'react';

interface GameStageProps {
  children: React.ReactNode;
}

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;
const ASPECT_RATIO = STAGE_WIDTH / STAGE_HEIGHT;

export function GameStage({ children }: GameStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    // Try to lock orientation to landscape (if supported)
    const lockOrientation = async () => {
      try {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape');
        }
      } catch {
        // Orientation lock not supported or denied - that's fine
      }
    };
    lockOrientation();

    const calculateScale = () => {
      if (!containerRef.current) return;
      
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      const containerAspect = containerWidth / containerHeight;

      let newScale: number;
      if (containerAspect > ASPECT_RATIO) {
        // Container is wider than stage - fit to height
        newScale = containerHeight / STAGE_HEIGHT;
      } else {
        // Container is taller than stage - fit to width
        newScale = containerWidth / STAGE_WIDTH;
      }
      
      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    window.addEventListener('orientationchange', calculateScale);

    return () => {
      window.removeEventListener('resize', calculateScale);
      window.removeEventListener('orientationchange', calculateScale);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center bg-background overflow-hidden"
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
