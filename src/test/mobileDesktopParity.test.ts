import { describe, it, expect } from "vitest";

/**
 * With viewport-relative sprite sizing, desktop and mobile use the SAME anchor data.
 * The sprite base scales proportionally with viewport width:
 *   spriteBasePx = Math.round(viewportWidth * 128 / 1366)
 *
 * This test verifies the math guarantees proportional parity.
 */
describe("viewport-relative sprite sizing parity", () => {
  const DESKTOP_BASE = 128;
  const DESKTOP_REF_WIDTH = 1366;
  const RATIO = DESKTOP_BASE / DESKTOP_REF_WIDTH;

  it("produces exactly 128px base at 1366px desktop", () => {
    const base = Math.round(1366 * RATIO);
    expect(base).toBe(128);
  });

  it("produces proportionally correct base at 360px mobile", () => {
    const base = Math.round(360 * RATIO);
    // 360 * 0.0937 ≈ 33.7 → rounds to 34
    expect(base).toBeGreaterThanOrEqual(33);
    expect(base).toBeLessThanOrEqual(34);
  });

  it("a scale of 3.3 occupies the same viewport % on desktop and mobile", () => {
    const scale = 3.3;
    const desktopPx = Math.round(1366 * RATIO) * scale;
    const mobilePx = Math.round(360 * RATIO) * scale;

    const desktopPct = desktopPx / 1366;
    const mobilePct = mobilePx / 360;

    // Should be within 1% of each other
    expect(Math.abs(desktopPct - mobilePct)).toBeLessThan(0.01);
  });

  it("large and xlarge variants maintain correct proportions", () => {
    const vw = 360;
    const base = Math.round(vw * RATIO);
    const large = Math.round(base * (144 / 128));
    const xlarge = Math.round(base * (160 / 128));

    expect(large).toBeGreaterThan(base);
    expect(xlarge).toBeGreaterThan(large);
    // Ratios preserved
    expect(large / base).toBeCloseTo(144 / 128, 1);
    expect(xlarge / base).toBeCloseTo(160 / 128, 1);
  });
});
