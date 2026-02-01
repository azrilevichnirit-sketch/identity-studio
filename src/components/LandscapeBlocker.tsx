import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * Blocks landscape orientation on mobile devices.
 * Shows a full-screen overlay asking the user to rotate their device to portrait.
 */
export function LandscapeBlocker() {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if it's a mobile device (touch + small screen)
      const isMobileDevice = 'ontouchstart' in window && window.innerWidth < 1024;
      setIsMobile(isMobileDevice);

      // Check if landscape (width > height) on mobile
      if (isMobileDevice) {
        const isLandscapeMode = window.innerWidth > window.innerHeight;
        setIsLandscape(isLandscapeMode);
      } else {
        setIsLandscape(false);
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

  // Disabled - game should work in both orientations
  // if (!isMobile || !isLandscape) {
  //   return null;
  // }
  
  // Always return null - no orientation blocking
  return null;
}
