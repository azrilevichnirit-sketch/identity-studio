// Shared constants/helpers for mobile panoramic panning.
// Keep these values in ONE place so background sizing, visual compensation,
// and drop-coordinate math always stay in sync.

/** Default pan range (0-1). 0.22 = ~22% extra content on each side. */
export const DEFAULT_PAN_RANGE = 0.22;

/** Full background width factor relative to viewport width. (1 + 2*panRange) */
export const PAN_IMAGE_WIDTH_FACTOR = 1 + DEFAULT_PAN_RANGE * 2; // 1.44

/** CSS background-size for panoramic backgrounds (width x height). */
export const PAN_BG_SIZE = `${PAN_IMAGE_WIDTH_FACTOR * 100}% 100%`;

/** Convert pan offset (percentage points) to content translateX (percentage). */
export function panOffsetToTranslatePercent(panOffsetX: number): string {
  // Positive panOffsetX shows LEFT side (content shifts right), so props must shift LEFT.
  return `${-panOffsetX * PAN_IMAGE_WIDTH_FACTOR}%`;
}

/** Convert pan offset (percentage points) to drop-X compensation (percentage points). */
export function panOffsetToDropCompensation(panOffsetX: number): number {
  return panOffsetX * PAN_IMAGE_WIDTH_FACTOR;
}
