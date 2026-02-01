import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EdgePanIndicatorsProps {
  /** Which edge is being approached: 'left', 'right', or null */
  activeEdge: 'left' | 'right' | null;
  /** Intensity of the approach (0-1, 1 = at edge) */
  intensity: number;
}

/**
 * Subtle edge indicators that appear during drag on mobile
 * to hint that the background will pan when approaching screen edges.
 */
export function EdgePanIndicators({ activeEdge, intensity }: EdgePanIndicatorsProps) {
  if (!activeEdge || intensity <= 0) return null;

  // Clamp intensity
  const clampedIntensity = Math.min(1, Math.max(0, intensity));
  
  // Calculate opacity (fade in as user approaches edge)
  const opacity = clampedIntensity * 0.85;
  
  // Calculate glow spread based on intensity
  const glowSpread = 15 + clampedIntensity * 25; // 15-40px

  return (
    <>
      {/* Left edge indicator */}
      <div
        className="edge-pan-indicator edge-pan-left"
        style={{
          opacity: activeEdge === 'left' ? opacity : 0,
          background: `linear-gradient(to right, rgba(255, 255, 255, ${0.25 * clampedIntensity}), transparent)`,
          boxShadow: activeEdge === 'left' 
            ? `inset ${glowSpread}px 0 ${glowSpread * 1.5}px -${glowSpread * 0.5}px rgba(255, 255, 255, ${0.3 * clampedIntensity})`
            : 'none',
        }}
      >
        <div 
          className="edge-pan-chevrons"
          style={{ opacity: clampedIntensity }}
        >
          <ChevronLeft className="edge-pan-chevron animate-pulse-left" />
          <ChevronLeft className="edge-pan-chevron animate-pulse-left" style={{ animationDelay: '150ms' }} />
        </div>
      </div>

      {/* Right edge indicator */}
      <div
        className="edge-pan-indicator edge-pan-right"
        style={{
          opacity: activeEdge === 'right' ? opacity : 0,
          background: `linear-gradient(to left, rgba(255, 255, 255, ${0.25 * clampedIntensity}), transparent)`,
          boxShadow: activeEdge === 'right'
            ? `inset -${glowSpread}px 0 ${glowSpread * 1.5}px -${glowSpread * 0.5}px rgba(255, 255, 255, ${0.3 * clampedIntensity})`
            : 'none',
        }}
      >
        <div 
          className="edge-pan-chevrons"
          style={{ opacity: clampedIntensity }}
        >
          <ChevronRight className="edge-pan-chevron animate-pulse-right" />
          <ChevronRight className="edge-pan-chevron animate-pulse-right" style={{ animationDelay: '150ms' }} />
        </div>
      </div>
    </>
  );
}
