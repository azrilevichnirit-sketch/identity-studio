// Shared constants/helpers for mobile panoramic panning.
// Keep these values in ONE place so background sizing, visual compensation,
// and drop-coordinate math always stay in sync.

/** Default pan range (0-1). 0.22 = ~22% extra content on each side. */
export const DEFAULT_PAN_RANGE = 0.22;

/** Full background width factor relative to viewport width. (1 + 2*panRange) */
export const PAN_IMAGE_WIDTH_FACTOR = 1 + DEFAULT_PAN_RANGE * 2; // 1.44

/** CSS background-size for panoramic backgrounds (width x height). */
export const PAN_BG_SIZE = `${PAN_IMAGE_WIDTH_FACTOR * 100}% 100%`;

/**
 * Convert an anchor-map X coordinate (0-100, calibrated on desktop where image = viewport)
 * to the CSS `left` percentage for panoramic mobile.
 *
 * On panoramic mobile the background image is 144% of viewport width. When centered
 * (background-position: 50%), the image left edge sits at -22% of viewport. A feature
 * at image position P% is therefore at viewport position: P * 1.44 - 22.
 */
export function anchorXToPanoramicLeft(anchorX: number): number {
  return anchorX * PAN_IMAGE_WIDTH_FACTOR - DEFAULT_PAN_RANGE * 100;
}

/**
 * Convert pan offset (percentage points) to content translateX (percentage).
 *
 * CSS background-position shift for a given offset d is: d * (1 - imageWidthFactor)
 * = d * -0.44. The content layer must shift by the same amount so tools track the
 * background. Since translateX(%) on a 100%-wide element equals viewport percentage,
 * we simply use the same factor: -d * 0.44.
 */
export function panOffsetToTranslatePercent(panOffsetX: number): string {
  // Factor = imageWidthFactor - 1 = 0.44
  return `${-panOffsetX * (PAN_IMAGE_WIDTH_FACTOR - 1)}%`;
}

/** Convert pan offset (percentage points) to drop-X compensation (percentage points). */
export function panOffsetToDropCompensation(panOffsetX: number): number {
  return panOffsetX * (PAN_IMAGE_WIDTH_FACTOR - 1);
}
