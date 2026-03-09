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
 * Crossfades between background images.
 * 
 * KEY PRINCIPLE: The previous layer sits ON TOP and only fades out AFTER the new
 * image is confirmed loaded. This guarantees no black flash — the old image
 * covers everything until the new one is ready to be revealed.
 */
export function BackgroundCrossfade({
  src,
  className,
  backgroundSize,
  backgroundPosition,
  backgroundRepeat = "no-repeat",
  filter,
  durationMs = 500,
  zIndex = 0,
}: BackgroundCrossfadeProps) {
  const [current, setCurrent] = useState(src);
  const [previous, setPrevious] = useState<string | null>(null);
  const [fadeOutPrev, setFadeOutPrev] = useState(false);
  const cleanupRef = useRef<number | null>(null);
  // Track the latest desired src to handle rapid changes
  const desiredSrcRef = useRef(src);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    desiredSrcRef.current = src;

    if (src === currentRef.current) return;

    let cancelled = false;

    const doTransition = () => {
      if (cancelled) return;
      // Only proceed if this src is still the desired one
      if (desiredSrcRef.current !== src) return;

      setPrevious(currentRef.current);
      setCurrent(src);
      currentRef.current = src;
      setFadeOutPrev(false);

      // Next frame: start fading out previous (new image is already loaded)
      requestAnimationFrame(() => {
        if (!cancelled) setFadeOutPrev(true);
      });

      // Clean up previous layer after fade completes
      if (cleanupRef.current) window.clearTimeout(cleanupRef.current);
      cleanupRef.current = window.setTimeout(() => {
        setPrevious(null);
      }, durationMs + 100);
    };

    // If already cached, transition immediately
    if (preloadedImages.has(src)) {
      doTransition();
      return;
    }

    // Preload FIRST, transition AFTER — this is the key to no black flashes
    preloadImage(src).then((loaded) => {
      if (cancelled || !loaded) return;
      doTransition();
    });

    // Safety fallback: force transition after 3s (very generous, prevents stuck UI)
    const fallbackId = window.setTimeout(() => {
      doTransition();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackId);
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
      {/* Current (new) background — always rendered, always visible */}
      <div
        className="absolute inset-0"
        style={{
          ...baseStyle,
          backgroundImage: `url(${current})`,
        }}
      />

      {/* Previous background — sits ON TOP, fades out only after new image is loaded */}
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
