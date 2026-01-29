import React from 'react';

interface GameStageProps {
  children: React.ReactNode;
  /** Optional background image URL */
  backgroundImage?: string;
  /** Apply saturation/contrast filter to background */
  enhanceBackground?: boolean;
  /** Additional className for the stage */
  className?: string;
}

/**
 * GameStage - Shared responsive wrapper for all game screens.
 * Mobile-first portrait layout (360x800, 390x844), scales naturally on desktop.
 * 
 * Features:
 * - Full viewport sizing with 100dvh for mobile browser compatibility
 * - Safe-area insets for iOS notch devices
 * - Background cover with optional enhancement filter
 * - Consistent z-index layering system
 * - No horizontal overflow
 */
export function GameStage({ 
  children, 
  backgroundImage,
  enhanceBackground = false,
  className = '',
}: GameStageProps) {
  return (
    <div 
      className={`fixed inset-0 overflow-hidden ${className}`}
      style={{
        width: '100vw',
        height: '100dvh',
        minHeight: '100vh', // Fallback for browsers without dvh
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      {/* Background layer - separate for filter isolation */}
      {backgroundImage && (
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: enhanceBackground ? 'saturate(1.18) contrast(1.08)' : undefined,
            zIndex: 0,
          }}
        />
      )}
      
      {/* Content container with safe-area padding */}
      <div 
        className="relative w-full h-full overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Z-index layering guide for GameStage children:
 * 
 * 0-5:   Background elements, placed props (back layer)
 * 6-10:  Scene extras, placed props (mid layer)
 * 11-15: Placed props (front layer), speech bubbles
 * 16-20: Avatar, main UI elements
 * 21-25: Tool dock, floating panels
 * 26-30: Navigation controls, back buttons
 * 31-40: Overlays, popovers, modals
 * 41-50: Dragging elements, tooltips
 */
