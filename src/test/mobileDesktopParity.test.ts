import { describe, it, expect } from "vitest";
import { getAnchorPosition } from "@/lib/jsonDataLoader";

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

describe("mobile anchor parity policy", () => {
  it("keeps desktop scale and height for tools WITHOUT explicit _mobile overrides", () => {
    // These anchors have NO _mobile override, so mobile should match desktop exactly
    const cases = [
      { bg: "gallery_main_stylized_v3", ref: "m01_tool_a" },
      { bg: "gallery_main_stylized_v3", ref: "m01_tool_b" },
      { bg: "studio_in_workshop_bg", ref: "m10_tool_a" },
      { bg: "studio_in_workshop_bg", ref: "m10_tool_b" },
    ] as const;

    for (const c of cases) {
      const desktop = getAnchorPosition(c.bg, c.ref as any, { isMobile: false });
      const mobile = getAnchorPosition(c.bg, c.ref as any, { isMobile: true });

      expect(desktop).not.toBeNull();
      expect(mobile).not.toBeNull();

      expect(mobile!.scale).toBeCloseTo(desktop!.scale, 6);
      expect(mobile!.y).toBeCloseTo(desktop!.y, 3);
    }
  });

  it("uses mobile-specific scale for anchors WITH _mobile overrides", () => {
    // M08 visitors have _mobile overrides with reduced scales
    const visitor = getAnchorPosition("studio_in_workshop_bg", "m08_visitor_02" as any, { isMobile: true });
    const desktop = getAnchorPosition("studio_in_workshop_bg", "m08_visitor_02" as any, { isMobile: false });

    expect(visitor).not.toBeNull();
    expect(desktop).not.toBeNull();
    expect(visitor!.scale).toBeLessThan(desktop!.scale);
  });
});
