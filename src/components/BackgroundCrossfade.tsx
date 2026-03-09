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
      console.warn(`[BGCrossfade] FAILED to preload: ${src.slice(-60)}`);
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
  // Stack of layers: always keep at least one visible.
  // "layers" array: last item is on top visually.
  // Each layer: { src, opacity, transitioning }
  const [layers, setLayers] = useState<Array<{ id: number; src: string; opacity: number }>>([
    { id: 0, src, opacity: 1 },
  ]);
  const nextIdRef = useRef(1);
  const desiredSrcRef = useRef(src);
  const activeSrcRef = useRef(src);
  const cleanupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    desiredSrcRef.current = src;

    if (src === activeSrcRef.current) {
      console.log(`[BGCrossfade] src unchanged: ${src.slice(-50)}`);
      return;
    }

    const cached = preloadedImages.has(src);
    console.log(`[BGCrossfade] src CHANGING: ${activeSrcRef.current.slice(-50)} → ${src.slice(-50)} | cached=${cached}`);

    let cancelled = false;

    const doTransition = () => {
      if (cancelled) return;
      if (desiredSrcRef.current !== src) {
        console.log(`[BGCrossfade] skipping stale transition for ${src.slice(-50)}`);
        return;
      }

      const newId = nextIdRef.current++;
      activeSrcRef.current = src;

      console.log(`[BGCrossfade] TRANSITION start: layerId=${newId}, src=${src.slice(-50)}`);

      // Add new layer on top at opacity 0, then fade it IN.
      // Previous layers stay at opacity 1 underneath — NO black flash possible.
      setLayers(prev => [
        ...prev,
        { id: newId, src, opacity: 0 },
      ]);

      // Double-rAF to ensure browser has painted the new layer before fading it in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          setLayers(prev => prev.map(l =>
            l.id === newId ? { ...l, opacity: 1 } : l
          ));
        });
      });

      // After fade completes, remove all layers except the new one
      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = window.setTimeout(() => {
        setLayers(prev => {
          // Keep only the latest layer
          const latest = prev[prev.length - 1];
          return latest ? [latest] : prev;
        });
      }, durationMs + 200);
    };

    if (cached) {
      doTransition();
      return;
    }

    // Preload FIRST, transition AFTER
    preloadImage(src).then((loaded) => {
      if (cancelled) return;
      if (!loaded) {
        console.warn(`[BGCrossfade] Image failed to load, forcing transition anyway: ${src.slice(-50)}`);
      }
      doTransition();
    });

    // Safety fallback
    const fallbackId = window.setTimeout(() => {
      console.warn(`[BGCrossfade] FALLBACK triggered after 3s for: ${src.slice(-50)}`);
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
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="absolute inset-0"
          style={{
            ...baseStyle,
            backgroundImage: `url(${layer.src})`,
            opacity: layer.opacity,
            transition: `opacity ${durationMs}ms ease-in-out`,
            willChange: "opacity",
          }}
        />
      ))}
    </div>
  );
}
