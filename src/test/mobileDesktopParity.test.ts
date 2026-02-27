import { describe, it, expect } from "vitest";

/**
 * The sprite base is VIEWPORT-PROPORTIONAL: Math.max(72, Math.min(128, Math.round(w * 0.0937)))
 * - Desktop 1366px → 128px
 * - Tablet 820px  → 77px
 * - Phone  360px  → 72px (clamped floor)
 *
 * getMobileFallbackScale is now a pass-through (no compression needed).
 */
describe("viewport-proportional sprite base", () => {
  function viewportBase(w: number): number {
    return Math.max(72, Math.min(128, Math.round(w * 0.0937)));
  }

  it("desktop 1366px → 128px", () => {
    expect(viewportBase(1366)).toBe(128);
  });

  it("tablet 820px → 77px", () => {
    expect(viewportBase(820)).toBe(77);
  });

  it("phone 390px → 72px (clamped)", () => {
    expect(viewportBase(390)).toBe(72);
  });

  it("phone 360px → 72px (clamped)", () => {
    expect(viewportBase(360)).toBe(72);
  });

  it("large desktop 1920px → 128px (capped)", () => {
    expect(viewportBase(1920)).toBe(128);
  });

  it("tool at scale 2.5 is proportional across viewports", () => {
    const scale = 2.5;
    const desktopPx = viewportBase(1366) * scale; // 320px / 1366 = 23%
    const tabletPx = viewportBase(820) * scale;   // 192px / 820 = 23%
    const phonePx = viewportBase(360) * scale;    // 180px / 360 = 50%

    // Desktop and tablet should be nearly identical ratio
    const desktopRatio = desktopPx / 1366;
    const tabletRatio = tabletPx / 820;
    expect(Math.abs(desktopRatio - tabletRatio)).toBeLessThan(0.02);

    // Phone is clamped so ratio is higher, but tool is still reasonable
    expect(phonePx).toBeGreaterThan(150);
    expect(phonePx).toBeLessThan(200);
  });
});
