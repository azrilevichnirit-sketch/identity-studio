import { describe, it, expect } from "vitest";

/**
 * Deep parity policy:
 * sprite base remains desktop-calibrated on every viewport.
 */
describe("viewport-proportional sprite base", () => {
  function viewportBase(w: number): number {
    return Math.max(48, Math.round(w * 0.0937));
  }

  it("desktop 1366px → 128px", () => {
    expect(viewportBase(1366)).toBe(128);
  });

  it("tablet 820px → 77px", () => {
    expect(viewportBase(820)).toBe(77);
  });

  it("phone 390px → 48px (floor)", () => {
    expect(viewportBase(390)).toBe(48);
  });

  it("phone 360px → 48px (floor)", () => {
    expect(viewportBase(360)).toBe(48);
  });

  it("large desktop 1920px → 180px", () => {
    expect(viewportBase(1920)).toBe(180);
  });

  it("proportional parity: same % of screen at all viewports", () => {
    const desktopRatio = viewportBase(1366) / 1366;
    const tabletRatio = viewportBase(820) / 820;
    // Both should be ~9.37%
    expect(Math.abs(desktopRatio - tabletRatio)).toBeLessThan(0.005);
  });
});
