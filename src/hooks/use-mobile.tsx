import * as React from "react";

const MOBILE_BREAKPOINT = 821;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const widthMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const coarsePointerMql = window.matchMedia("(pointer: coarse)");

    const evaluateIsMobile = () => {
      const isNarrowViewport = window.innerWidth < MOBILE_BREAKPOINT;
      const isPhoneLandscape =
        coarsePointerMql.matches &&
        window.innerWidth > window.innerHeight &&
        window.innerHeight <= 500;

      setIsMobile(isNarrowViewport || isPhoneLandscape);
    };

    widthMql.addEventListener("change", evaluateIsMobile);
    coarsePointerMql.addEventListener("change", evaluateIsMobile);
    window.addEventListener("resize", evaluateIsMobile);

    evaluateIsMobile();

    return () => {
      widthMql.removeEventListener("change", evaluateIsMobile);
      coarsePointerMql.removeEventListener("change", evaluateIsMobile);
      window.removeEventListener("resize", evaluateIsMobile);
    };
  }, []);

  return !!isMobile;
}
