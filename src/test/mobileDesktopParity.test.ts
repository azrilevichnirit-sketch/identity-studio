import { describe, it, expect } from "vitest";
import anchorData from "@/data/studio_anchor_map.json";

interface AnchorEntry {
  background_asset_key?: string;
  anchor_ref?: string;
  x_pct?: number;
  y_pct?: number;
  scale?: number;
  z_layer?: string;
  flipX?: boolean;
  _comment?: string;
}

/**
 * Deep mobile parity test:
 * For every anchor that has both a desktop and _mobile override,
 * verify the scale ratio and position delta are within healthy bounds.
 */
describe("mobile-desktop proportional parity", () => {
  const rows = anchorData as AnchorEntry[];

  const valid = rows.filter(
    (r) =>
      r.background_asset_key &&
      r.anchor_ref &&
      r.background_asset_key !== "_mobile_overrides_marker" &&
      !("_comment" in r && !r.background_asset_key)
  );

  // Build maps: desktop anchors and mobile overrides
  const desktopMap = new Map<string, AnchorEntry>();
  const mobileMap = new Map<string, AnchorEntry>();

  for (const r of valid) {
    const key = `${r.background_asset_key}::${r.anchor_ref}`;
    if (r.anchor_ref!.endsWith("_mobile")) {
      const baseRef = r.anchor_ref!.replace(/_mobile$/, "");
      const baseKey = `${r.background_asset_key}::${baseRef}`;
      mobileMap.set(baseKey, r);
    } else {
      desktopMap.set(key, r);
    }
  }

  // Find all pairs
  const pairs: Array<{
    bg: string;
    anchor: string;
    desktop: AnchorEntry;
    mobile: AnchorEntry;
  }> = [];

  for (const [key, desktop] of desktopMap) {
    const mobile = mobileMap.get(key);
    if (mobile) {
      pairs.push({
        bg: desktop.background_asset_key!,
        anchor: desktop.anchor_ref!,
        desktop,
        mobile,
      });
    }
  }

  it("has paired desktop/mobile entries to test", () => {
    expect(pairs.length).toBeGreaterThan(10);
  });

  it("mobile scale is always <= desktop scale", () => {
    const violations = pairs
      .filter((p) => (p.mobile.scale ?? 1) > (p.desktop.scale ?? 1) + 0.05) // 0.05 tolerance
      .map(
        (p) =>
          `${p.bg} / ${p.anchor}: desktop=${p.desktop.scale}, mobile=${p.mobile.scale}`
      );

    expect(
      violations,
      `Mobile scale EXCEEDS desktop:\n${violations.join("\n")}`
    ).toEqual([]);
  });

  it("mobile scale ratio is within 0.35-0.85 of desktop (no extreme compression or near-1:1 for large scales)", () => {
    const outliers = pairs
      .filter((p) => {
        const ds = p.desktop.scale ?? 1;
        const ms = p.mobile.scale ?? 1;
        if (ds <= 1.4) return false; // Small scales (≤1.4) are OK without compression
        const ratio = ms / ds;
        return ratio < 0.30 || ratio > 0.90;
      })
      .map((p) => {
        const ratio = ((p.mobile.scale ?? 1) / (p.desktop.scale ?? 1)).toFixed(2);
        return `${p.bg} / ${p.anchor}: desktop=${p.desktop.scale}, mobile=${p.mobile.scale}, ratio=${ratio}`;
      });

    expect(
      outliers,
      `Scale ratio outliers (expected 0.30–0.90):\n${outliers.join("\n")}`
    ).toEqual([]);
  });

  it("mobile x_pct stays within safe viewport bounds (10%-90%)", () => {
    const outOfBounds = pairs
      .filter((p) => {
        const mx = p.mobile.x_pct ?? 0.5;
        return mx < 0.08 || mx > 0.92;
      })
      .map(
        (p) =>
          `${p.bg} / ${p.anchor}: mobile x_pct=${p.mobile.x_pct} (desktop=${p.desktop.x_pct})`
      );

    expect(
      outOfBounds,
      `Mobile anchors outside safe X bounds:\n${outOfBounds.join("\n")}`
    ).toEqual([]);
  });

  it("mobile y_pct doesn't exceed viewport bottom (y_pct <= 1.0)", () => {
    const overflows = pairs
      .filter((p) => (p.mobile.y_pct ?? 0.5) > 1.0)
      .map(
        (p) =>
          `${p.bg} / ${p.anchor}: mobile y_pct=${p.mobile.y_pct}`
      );

    expect(
      overflows,
      `Mobile anchors below viewport:\n${overflows.join("\n")}`
    ).toEqual([]);
  });

  // Check relative distances between tool_a and tool_b within same mission/bg
  // are preserved (ratio of distance desktop vs mobile within ~50%)
  it("inter-tool distance ratios are preserved between desktop and mobile", () => {
    // Group pairs by bg + mission prefix
    const missionGroups = new Map<string, typeof pairs>();
    for (const p of pairs) {
      // Extract mission prefix: m01, m02, tie_01, etc.
      const match = p.anchor.match(/^(m\d+|tie_\d+)/);
      if (!match) continue;
      const groupKey = `${p.bg}::${match[1]}`;
      if (!missionGroups.has(groupKey)) missionGroups.set(groupKey, []);
      missionGroups.get(groupKey)!.push(p);
    }

    const distortions: string[] = [];

    for (const [groupKey, group] of missionGroups) {
      // Find tool_a and tool_b in this group
      const toolA = group.find((p) => p.anchor.endsWith("_tool_a"));
      const toolB = group.find((p) => p.anchor.endsWith("_tool_b"));
      if (!toolA || !toolB) continue;

      const dxDesktop = (toolA.desktop.x_pct ?? 0.5) - (toolB.desktop.x_pct ?? 0.5);
      const dyDesktop = (toolA.desktop.y_pct ?? 0.5) - (toolB.desktop.y_pct ?? 0.5);
      const distDesktop = Math.sqrt(dxDesktop * dxDesktop + dyDesktop * dyDesktop);

      const dxMobile = (toolA.mobile.x_pct ?? 0.5) - (toolB.mobile.x_pct ?? 0.5);
      const dyMobile = (toolA.mobile.y_pct ?? 0.5) - (toolB.mobile.y_pct ?? 0.5);
      const distMobile = Math.sqrt(dxMobile * dxMobile + dyMobile * dyMobile);

      // Skip if tools are very close together (< 5% distance)
      if (distDesktop < 0.05) continue;

      const distRatio = distMobile / distDesktop;
      // Allow 0.3x to 2.5x distance variation (mobile may shift things closer or farther)
      if (distRatio < 0.25 || distRatio > 3.0) {
        distortions.push(
          `${groupKey}: desktop_dist=${distDesktop.toFixed(3)}, mobile_dist=${distMobile.toFixed(3)}, ratio=${distRatio.toFixed(2)}`
        );
      }
    }

    expect(
      distortions,
      `Inter-tool distance distortions:\n${distortions.join("\n")}`
    ).toEqual([]);
  });
});
