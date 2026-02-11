import { useEffect } from 'react';
import { BackgroundCrossfade } from './BackgroundCrossfade';
import { usePanningBackground } from '@/hooks/usePanningBackground';
import { PAN_BG_SIZE } from '@/lib/pan';

export type PanningApi = {
  updatePanFromDrag: (normalizedX: number) => void;
  resetPan: () => void;
  panToPosition: (targetXPercent: number) => void;
  /** Current pan offset in percentage points (0 = centered, positive = showing left, negative = showing right) */
  getOffsetX: () => number;
};

type PannableBackgroundProps = {
  src: string;
  className?: string;
  filter?: string;
  durationMs?: number;
  zIndex?: number;

  /** Whether panning behavior should be active */
  enabled: boolean;
  /** Whether this background is panoramic (controls size + position strategy) */
  isPanoramic: boolean;
  /** Whether viewport is mobile (applies vertical framing even when not panoramic) */
  isMobileView?: boolean;
  /** Auto-pan target on mount (0-100, percentage from left) */
  initialTargetX?: number;

  /** Provides imperative access to pan controls without re-rendering parent */
  panApiRef?: React.MutableRefObject<PanningApi | null>;
};

/**
 * Keeps panning re-renders LOCAL to the background only.
 * This prevents the entire VisualPlayScreen from re-rendering at 60fps while panning,
 * which can cause jank on mobile.
 */
export function PannableBackground({
  src,
  className,
  filter,
  durationMs,
  zIndex,
  enabled,
  isPanoramic,
  isMobileView,
  initialTargetX,
  panApiRef,
}: PannableBackgroundProps) {
  const { backgroundPosition, offsetX, updatePanFromDrag, resetPan, panToPosition } = usePanningBackground({
    enabled,
    initialTargetX,
  });

  useEffect(() => {
    if (!panApiRef) return;
    panApiRef.current = { 
      updatePanFromDrag, 
      resetPan, 
      panToPosition,
      getOffsetX: () => offsetX,
    };
    return () => {
      if (panApiRef.current) panApiRef.current = null;
    };
  }, [panApiRef, updatePanFromDrag, resetPan, panToPosition, offsetX]);

  // Use 85% vertical on mobile to give a slight top-down angle (less ceiling, more floor)
  // so placed tools on the floor remain visible
  const effectiveBgPosition = isPanoramic
    ? backgroundPosition
    : ((isMobileView ?? enabled) ? 'center 85%' : 'center');
  // IMPORTANT: Use an explicit panoramic width so panning is always visible
  // and matches our compensation math (see src/lib/pan.ts).
  const effectiveBgSize = isPanoramic ? PAN_BG_SIZE : 'cover';

  return (
    <BackgroundCrossfade
      src={src}
      className={className}
      backgroundSize={effectiveBgSize}
      backgroundPosition={effectiveBgPosition}
      backgroundRepeat="no-repeat"
      filter={filter}
      durationMs={durationMs ?? 800}
      zIndex={zIndex}
    />
  );
}
