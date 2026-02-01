import { useState, useCallback, useRef, useEffect } from 'react';
import { useIsMobile } from './use-mobile';

interface PanState {
  offsetX: number; // 0 = centered, negative = showing right side, positive = showing left side
}

interface UsePanningBackgroundOptions {
  /** Whether panning is enabled (typically only on mobile) */
  enabled?: boolean;
  /** How much of the panoramic image extends beyond viewport (0-1, e.g., 0.5 = 50% extra on each side) */
  panRange?: number;
  /** Edge zone size as percentage of screen width (0-1) */
  edgeZone?: number;
  /** Pan speed in percentage points per frame */
  panSpeed?: number;
  /** Initial target X position (0-100, percentage from left) - auto-pans to show this area */
  initialTargetX?: number;
}

interface UsePanningBackgroundResult {
  /** Current background position X offset (percentage) */
  offsetX: number;
  /** Background position CSS value */
  backgroundPosition: string;
  /** Call this during drag with current pointer X position (0-1 normalized) */
  updatePanFromDrag: (normalizedX: number) => void;
  /** Reset pan to center */
  resetPan: () => void;
  /** Set pan to show a specific X position (0-100 percentage) */
  panToPosition: (targetXPercent: number) => void;
  /** Whether currently panning */
  isPanning: boolean;
}

/**
 * Hook for edge-triggered background panning on mobile.
 * When dragging near screen edges, the background shifts to reveal more of the panorama.
 * Also supports auto-panning to a target position (e.g., where a tool should be placed).
 */
export function usePanningBackground(
  options: UsePanningBackgroundOptions = {}
): UsePanningBackgroundResult {
  const isMobile = useIsMobile();
  const {
    enabled = isMobile,
    panRange = 0.25, // 25% extra on each side (so 16:9 can show in 9:16 viewport)
    edgeZone = 0.2, // 20% from each edge triggers pan
    panSpeed = 0.8, // percentage points per frame
    initialTargetX,
  } = options;

  const [panState, setPanState] = useState<PanState>({ offsetX: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  const animationFrameRef = useRef<number | null>(null);
  const targetOffsetRef = useRef(0);
  const currentNormalizedXRef = useRef(0.5);
  const hasInitializedRef = useRef(false);

  // Calculate target offset based on pointer position
  const calculateTargetOffset = useCallback((normalizedX: number): number => {
    if (!enabled) return 0;
    
    // Left edge zone (0 to edgeZone) -> pan right (show left side of image)
    if (normalizedX < edgeZone) {
      const intensity = 1 - (normalizedX / edgeZone); // 1 at edge, 0 at zone boundary
      return panRange * 100 * intensity;
    }
    
    // Right edge zone (1-edgeZone to 1) -> pan left (show right side of image)
    if (normalizedX > 1 - edgeZone) {
      const intensity = (normalizedX - (1 - edgeZone)) / edgeZone; // 0 at zone boundary, 1 at edge
      return -panRange * 100 * intensity;
    }
    
    // Center zone -> gradually return to center
    return 0;
  }, [enabled, edgeZone, panRange]);

  // Calculate offset needed to show a specific X position
  const calculateOffsetForPosition = useCallback((targetXPercent: number): number => {
    if (!enabled) return 0;
    
    // If target is on the left side (< 35%), pan to show left
    if (targetXPercent < 35) {
      const intensity = (35 - targetXPercent) / 35; // 1 at 0%, 0 at 35%
      return panRange * 100 * intensity;
    }
    
    // If target is on the right side (> 65%), pan to show right
    if (targetXPercent > 65) {
      const intensity = (targetXPercent - 65) / 35; // 0 at 65%, 1 at 100%
      return -panRange * 100 * intensity;
    }
    
    // Center area - no pan needed
    return 0;
  }, [enabled, panRange]);

  // Animation loop for smooth panning
  const animatePan = useCallback(() => {
    setPanState(prev => {
      const target = targetOffsetRef.current;
      const diff = target - prev.offsetX;
      
      // If close enough, snap to target
      if (Math.abs(diff) < 0.1) {
        if (target === 0) {
          setIsPanning(false);
        }
        return { offsetX: target };
      }
      
      // Ease toward target
      const newOffset = prev.offsetX + diff * 0.15;
      return { offsetX: newOffset };
    });
    
    animationFrameRef.current = requestAnimationFrame(animatePan);
  }, []);

  // Start/stop animation loop
  useEffect(() => {
    if (enabled && isPanning) {
      animationFrameRef.current = requestAnimationFrame(animatePan);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, isPanning, animatePan]);

  // Auto-pan to initial target on mount or when initialTargetX changes
  useEffect(() => {
    if (!enabled || initialTargetX === undefined) return;
    
    // Calculate offset for the target position
    const offset = calculateOffsetForPosition(initialTargetX);
    targetOffsetRef.current = offset;
    
    // Set immediately on first render, animate on subsequent changes
    if (!hasInitializedRef.current) {
      setPanState({ offsetX: offset });
      hasInitializedRef.current = true;
    } else {
      setIsPanning(true);
    }
  }, [enabled, initialTargetX, calculateOffsetForPosition]);

  // Reset initialization flag when disabled
  useEffect(() => {
    if (!enabled) {
      hasInitializedRef.current = false;
    }
  }, [enabled]);

  // Update pan from drag position
  const updatePanFromDrag = useCallback((normalizedX: number) => {
    if (!enabled) return;
    
    currentNormalizedXRef.current = normalizedX;
    targetOffsetRef.current = calculateTargetOffset(normalizedX);
    
    if (!isPanning && targetOffsetRef.current !== 0) {
      setIsPanning(true);
    }
  }, [enabled, calculateTargetOffset, isPanning]);

  // Reset pan to center
  const resetPan = useCallback(() => {
    targetOffsetRef.current = 0;
    if (!isPanning) {
      setIsPanning(true); // Start animation to return to center
    }
  }, [isPanning]);

  // Pan to show a specific X position
  const panToPosition = useCallback((targetXPercent: number) => {
    if (!enabled) return;
    
    targetOffsetRef.current = calculateOffsetForPosition(targetXPercent);
    if (!isPanning) {
      setIsPanning(true);
    }
  }, [enabled, calculateOffsetForPosition, isPanning]);

  // Calculate background position
  // Base is 50% (centered), offset shifts left/right
  const backgroundPosition = `${50 + panState.offsetX}% 100%`;

  return {
    offsetX: panState.offsetX,
    backgroundPosition,
    updatePanFromDrag,
    resetPan,
    panToPosition,
    isPanning,
  };
}
