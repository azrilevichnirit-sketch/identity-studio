import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

interface LandscapeEnforcerProps {
  children: React.ReactNode;
}

export function LandscapeEnforcer({ children }: LandscapeEnforcerProps) {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Only enforce on mobile devices (touch-capable with small screens)
      const isMobileDevice = window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches;
      const isPortraitMode = window.innerHeight > window.innerWidth;
      
      setIsMobile(isMobileDevice);
      setIsPortrait(isMobileDevice && isPortraitMode);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (isPortrait && isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="relative">
            <div className="w-20 h-32 border-4 border-primary rounded-2xl relative animate-pulse">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary/50 rounded-full" />
            </div>
            <RotateCcw className="absolute -right-3 -bottom-3 w-8 h-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">סובבי את המכשיר</h2>
            <p className="text-muted-foreground text-lg">המשחק פועל במצב אופקי בלבד</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
