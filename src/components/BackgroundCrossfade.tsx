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

/**
 * Crossfades between background images using opacity.
 * (CSS can't smoothly animate background-image changes.)
 */
export function BackgroundCrossfade({
  src,
  className,
  backgroundSize,
  backgroundPosition,
  backgroundRepeat = "no-repeat",
  filter,
  durationMs = 900,
  zIndex = 0,
}: BackgroundCrossfadeProps) {
  const [current, setCurrent] = useState(src);
  const [previous, setPrevious] = useState<string | null>(null);
  const [fadeOutPrev, setFadeOutPrev] = useState(false);
  const cleanupRef = useRef<number | null>(null);

  useEffect(() => {
    if (src === current) return;

    setPrevious(current);
    setCurrent(src);
    setFadeOutPrev(false);

    const raf = window.requestAnimationFrame(() => setFadeOutPrev(true));

    if (cleanupRef.current) window.clearTimeout(cleanupRef.current);
    cleanupRef.current = window.setTimeout(() => {
      setPrevious(null);
    }, durationMs + 30);

    return () => {
      window.cancelAnimationFrame(raf);
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
      <div
        className="absolute inset-0"
        style={{
          ...baseStyle,
          backgroundImage: `url(${current})`,
        }}
      />

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
