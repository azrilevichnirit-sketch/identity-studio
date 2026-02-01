import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EdgePanIndicatorsProps {
  /** Which edge is being approached: 'left', 'right', or null */
  activeEdge: 'left' | 'right' | null;
  /** Intensity of the approach (0-1, 1 = at edge) */
  intensity: number;
}

/**
 * Bold edge indicators that appear during drag on mobile
 * to hint that the background will pan when approaching screen edges.
 */
export function EdgePanIndicators({ activeEdge, intensity }: EdgePanIndicatorsProps) {
  if (!activeEdge || intensity <= 0) return null;

  // Clamp intensity and boost it for visibility
  const clampedIntensity = Math.min(1, Math.max(0, intensity));
  // Boost: starts visible earlier and reaches full opacity faster
  const boostedIntensity = Math.min(1, clampedIntensity * 1.5 + 0.2);
  
  // Calculate opacity (more aggressive fade in)
  const opacity = boostedIntensity;
  
  // Calculate glow spread based on intensity (wider and brighter)
  const glowSpread = 25 + clampedIntensity * 40; // 25-65px

  return (
    <>
      {/* Left edge indicator */}
      <div
        className="edge-pan-indicator edge-pan-left"
        style={{
          opacity: activeEdge === 'left' ? opacity : 0,
          background: `linear-gradient(to right, 
            rgba(100, 220, 200, ${0.5 * boostedIntensity}), 
            rgba(100, 220, 200, ${0.25 * boostedIntensity}), 
            transparent)`,
          boxShadow: activeEdge === 'left' 
            ? `inset ${glowSpread}px 0 ${glowSpread * 2}px -${glowSpread * 0.3}px rgba(100, 220, 200, ${0.6 * boostedIntensity})`
            : 'none',
        }}
      >
        <div 
          className="edge-pan-chevrons"
          style={{ opacity: boostedIntensity }}
        >
          {/* Arrows point toward the edge (direction user is dragging) */}
          <ChevronRight className="edge-pan-chevron animate-pulse-right" strokeWidth={3} />
          <ChevronRight className="edge-pan-chevron animate-pulse-right" strokeWidth={3} style={{ animationDelay: '100ms' }} />
          <ChevronRight className="edge-pan-chevron animate-pulse-right" strokeWidth={3} style={{ animationDelay: '200ms' }} />
        </div>
      </div>

      {/* Right edge indicator */}
      <div
        className="edge-pan-indicator edge-pan-right"
        style={{
          opacity: activeEdge === 'right' ? opacity : 0,
          background: `linear-gradient(to left, 
            rgba(100, 220, 200, ${0.5 * boostedIntensity}), 
            rgba(100, 220, 200, ${0.25 * boostedIntensity}), 
            transparent)`,
          boxShadow: activeEdge === 'right'
            ? `inset -${glowSpread}px 0 ${glowSpread * 2}px -${glowSpread * 0.3}px rgba(100, 220, 200, ${0.6 * boostedIntensity})`
            : 'none',
        }}
      >
        <div 
          className="edge-pan-chevrons"
          style={{ opacity: boostedIntensity }}
        >
          {/* Arrows point toward the edge (direction user is dragging) */}
          <ChevronLeft className="edge-pan-chevron animate-pulse-left" strokeWidth={3} />
          <ChevronLeft className="edge-pan-chevron animate-pulse-left" strokeWidth={3} style={{ animationDelay: '100ms' }} />
          <ChevronLeft className="edge-pan-chevron animate-pulse-left" strokeWidth={3} style={{ animationDelay: '200ms' }} />
        </div>
      </div>
    </>
  );
}
