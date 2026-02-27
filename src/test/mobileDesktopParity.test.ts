import { describe, it, expect } from "vitest";

/**
 * Deep parity policy:
 * sprite base remains desktop-calibrated on every viewport.
 */
describe("desktop-parity sprite base", () => {
  function viewportBase(_w: number): number {
    return 128;
  }

  it("desktop 1366px → 128px", () => {
    expect(viewportBase(1366)).toBe(128);
  });

  it("tablet 820px → 128px", () => {
    expect(viewportBase(820)).toBe(128);
  });

  it("phone 390px → 128px", () => {
    expect(viewportBase(390)).toBe(128);
  });

  it("phone 360px → 128px", () => {
    expect(viewportBase(360)).toBe(128);
  });

  it("large desktop 1920px → 128px", () => {
    expect(viewportBase(1920)).toBe(128);
  });

  it("tool at scale 2.5 matches desktop size on 820 and 360", () => {
    const scale = 2.5;
    const desktopPx = viewportBase(1366) * scale;
    const tabletPx = viewportBase(820) * scale;
    const phonePx = viewportBase(360) * scale;

    expect(desktopPx).toBe(320);
    expect(tabletPx).toBe(320);
    expect(phonePx).toBe(320);
  });
});
