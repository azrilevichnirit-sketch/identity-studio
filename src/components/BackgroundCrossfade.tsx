import { useEffect, useRef, useState } from "react";
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

function preloadImage(src: string): Promise<boolean> {
  if (preloadedImages.has(src)) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.add(src);
      resolve(true);
    };
    img.onerror = () => {
      console.warn(`BackgroundCrossfade: Failed to preload ${src}`);
      resolve(false);
    };
    img.src = src;

    // If the image is already in browser cache, complete can be synchronous.
    if (img.complete && img.naturalWidth > 0) {
      preloadedImages.add(src);
      resolve(true);
    }
  });
}

/** Register a URL as already preloaded (e.g. from preloadAllBackgrounds) */
export function markPreloaded(src: string) {
  preloadedImages.add(src);
}

/**
 * Crossfades between background images using opacity.
 * IMPORTANT: Preloads new background before transitioning to prevent black screen flash.
 * Uses refs to avoid stale closure issues during rapid transitions.
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
  // Track whether the initial image has loaded (for fade-in on first render)
  const [initialReady, setInitialReady] = useState(() => preloadedImages.has(src));
  const cleanupRef = useRef<number | null>(null);
  const pendingSrcRef = useRef<string | null>(null);
  // Use a ref to always have the latest `current` value, avoiding stale closures
  const currentRef = useRef(current);
  currentRef.current = current;

  // Preload initial image on mount and fade in when ready
  useEffect(() => {
    if (initialReady) return;
    preloadImage(src).then((loaded) => {
      if (loaded) {
        requestAnimationFrame(() => setInitialReady(true));
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (src === currentRef.current) return;

    // Track the pending source to handle rapid changes
    pendingSrcRef.current = src;

    let didTransition = false;
    const doTransition = () => {
      if (didTransition) return;
      didTransition = true;
      // Only proceed if this src is still the one we want
      if (pendingSrcRef.current !== src) return;

      // Use ref to get the LATEST current value (not a stale closure)
      setPrevious(currentRef.current);
      setCurrent(src);
      currentRef.current = src;
      setFadeOutPrev(false);
      pendingSrcRef.current = null;

      // Next frame: start fading out previous
      requestAnimationFrame(() => setFadeOutPrev(true));

      // Clean up previous layer after fade completes
      if (cleanupRef.current) window.clearTimeout(cleanupRef.current);
      cleanupRef.current = window.setTimeout(() => {
        setPrevious(null);
      }, durationMs + 50);
    };

    // Transition after the new image is loaded, with a fallback timeout
    // to prevent the UI from getting stuck if preload fails.
    let fallbackTimer: number | null = null;

    preloadImage(src).then((loaded) => {
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      // Proceed even on failure - showing a potentially broken bg is better than being stuck
      doTransition();
    });

    // Fallback: force transition after 400ms even if image hasn't loaded
    fallbackTimer = window.setTimeout(() => {
      fallbackTimer = null;
      doTransition();
    }, 400);

    return () => {
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, durationMs]);

  const baseStyle = {
    backgroundSize,
    backgroundPosition,
    backgroundRepeat,
    filter,
  } as const;

  return (
    <div className={cn("absolute inset-0", className)} style={{ zIndex }}>
      {/* Current (new) background - fades in on first load */}
      <div
        className="absolute inset-0"
        style={{
          ...baseStyle,
          backgroundImage: `url(${current})`,
          opacity: initialReady ? 1 : 0,
          transition: `opacity ${durationMs}ms ease-in-out`,
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