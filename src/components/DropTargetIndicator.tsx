import { memo } from "react";

export type DropTargetIndicatorMode = "drag" | "carry";

type DropTargetIndicatorProps = {
  mode: DropTargetIndicatorMode;
  /** Optional label shown only in carry mode */
  label?: string;
};

/**
 * Pure UI indicator for the drop target (ring + arrow + hand).
 * IMPORTANT: No game logic here.
 * Uses design tokens via CSS (HSL) to ensure consistent rendering on mobile browsers.
 */
export const DropTargetIndicator = memo(function DropTargetIndicator({
  mode,
  label = "לחץ כאן להנחה",
}: DropTargetIndicatorProps) {
  return (
    <div className="drop-target" aria-hidden="true">
      <div className="drop-target-glow" />

      <div className="drop-target-ring">
        <div className="drop-target-dot" />
      </div>

      <div className="drop-target-arrow" aria-hidden="true">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12l7 7 7-7"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="drop-target-hand" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15V6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </div>

      {mode === "carry" ? <div className="drop-target-label">{label}</div> : null}
    </div>
  );
});
