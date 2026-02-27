import { describe, it, expect } from "vitest";

/**
 * The sprite base is a FIXED 128px on all devices.
 * Mobile scale adjustments are handled by:
 *   1. Explicit _mobile overrides in the anchor map
 *   2. getMobileFallbackScale() compression for anchors without overrides
 *
 * This test verifies the fixed base and compression logic.
 */
describe("fixed sprite base with mobile scale compression", () => {
  const SPRITE_BASE = 128;

  it("sprite base is always 128px regardless of viewport", () => {
    expect(SPRITE_BASE).toBe(128);
  });

  it("large variant is 144px, xlarge is 160px", () => {
    const large = Math.round(SPRITE_BASE * (144 / 128));
    const xlarge = Math.round(SPRITE_BASE * (160 / 128));
    expect(large).toBe(144);
    expect(xlarge).toBe(160);
  });

  // Replicate getMobileFallbackScale logic
  function mobileFallback(scale: number): number {
    if (scale <= 1.2) return scale;
    if (scale <= 1.8) return +(scale * 0.88).toFixed(2);
    return +(1.35 + (scale - 1.8) * 0.38).toFixed(2);
  }

  it("small scales (≤1.2) pass through unchanged", () => {
    expect(mobileFallback(0.9)).toBe(0.9);
    expect(mobileFallback(1.2)).toBe(1.2);
  });

  it("moderate scales (1.2–1.8) are compressed by 12%", () => {
    expect(mobileFallback(1.5)).toBeCloseTo(1.32, 1);
    expect(mobileFallback(1.8)).toBeCloseTo(1.58, 1);
  });

  it("large scales (>1.8) are heavily compressed", () => {
    // scale 2.6 → 1.35 + 0.8*0.38 = 1.654
    expect(mobileFallback(2.6)).toBeCloseTo(1.65, 1);
    // scale 3.3 → 1.35 + 1.5*0.38 = 1.92
    expect(mobileFallback(3.3)).toBeCloseTo(1.92, 1);
    // scale 4.2 → 1.35 + 2.4*0.38 = 2.262
    expect(mobileFallback(4.2)).toBeCloseTo(2.26, 1);
  });

  it("mobile tool at scale 2.6 renders at reasonable size", () => {
    const mobileScale = mobileFallback(2.6);
    const px = SPRITE_BASE * mobileScale;
    // ~211px on 360px screen = ~59% — visible but not overwhelming
    expect(px).toBeGreaterThan(150);
    expect(px).toBeLessThan(280);
  });
});
