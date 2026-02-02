import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

type BackgroundCrossfadeProps = {
  src: string;
  className?: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat?: string;
  filter?: string;
  durationMs?: number;
  zIndex?: number;
};

// Cache of preloaded images to avoid re-fetching
const preloadedImages = new Set<string>();

function preloadImage(src: string): Promise<void> {
  if (preloadedImages.has(src)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.add(src);
      resolve();
    };
    img.onerror = () => {
      console.warn(`BackgroundCrossfade: Failed to preload ${src}`);
      // Still resolve to avoid blocking
      resolve();
    };
    img.src = src;
  });
}

/**
 * Crossfades between background images using opacity.
 * IMPORTANT: Preloads new background before transitioning to prevent black screen flash.
 * (CSS can't smoothly animate background-image changes.)
 */
export function BackgroundCrossfade({
  src,
  className,
  backgroundSize,
  backgroundPosition,
  backgroundRepeat = "no-repeat",
  filter,
  durationMs = 800,
  zIndex = 0,
}: BackgroundCrossfadeProps) {
  const [current, setCurrent] = useState(src);
  const [previous, setPrevious] = useState<string | null>(null);
  const [fadeOutPrev, setFadeOutPrev] = useState(false);
  const [isReady, setIsReady] = useState(true);
  const cleanupRef = useRef<number | null>(null);
  const pendingSrcRef = useRef<string | null>(null);

  // Preload initial image on mount
  useEffect(() => {
    preloadImage(src);
  }, []);

  const startTransition = useCallback((newSrc: string) => {
    setPrevious(current);
    setCurrent(newSrc);
    setFadeOutPrev(false);
    setIsReady(true);

    const raf = window.requestAnimationFrame(() => setFadeOutPrev(true));

    if (cleanupRef.current) window.clearTimeout(cleanupRef.current);
    cleanupRef.current = window.setTimeout(() => {
      setPrevious(null);
    }, durationMs + 30);

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [current, durationMs]);

  useEffect(() => {
    if (src === current) return;

    // Track the pending source to handle rapid changes
    pendingSrcRef.current = src;

    // Preload the new image before transitioning
    preloadImage(src).then(() => {
      // Only transition if this is still the latest requested src
      if (pendingSrcRef.current === src) {
        startTransition(src);
        pendingSrcRef.current = null;
      }
    });

    return () => {
      if (cleanupRef.current) window.clearTimeout(cleanupRef.current);
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const baseStyle = {
    backgroundSize,
    backgroundPosition,
    backgroundRepeat,
    filter,
  } as const;

  return (
    <div className={cn("absolute inset-0", className)} style={{ zIndex }}>
      {/* Current (new) background - always rendered at bottom of stack */}
      <div
        className="absolute inset-0"
        style={{
          ...baseStyle,
          backgroundImage: `url(${current})`,
        }}
      />

      {/* Previous background - fades out on top, hiding any loading delay */}
      {previous ? (
        <div
          className="absolute inset-0"
          style={{
            ...baseStyle,
            backgroundImage: `url(${previous})`,
            opacity: fadeOutPrev ? 0 : 1,
            transition: `opacity ${durationMs}ms ease-in-out`,
            willChange: "opacity",
          }}
        />
      ) : null}
    </div>
  );
}
