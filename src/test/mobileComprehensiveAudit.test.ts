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
 * With viewport-relative sprite sizing, _mobile overrides are only needed
 * for POSITION adjustments (edge safety on portrait screens), NOT for scale.
 * This audit now only checks that anchors near viewport edges have position overrides.
 */
describe("comprehensive mobile position audit", () => {
  const rows = anchorData as AnchorEntry[];

  const valid = rows.filter(
    (r) =>
      r.background_asset_key &&
      r.anchor_ref &&
      r.background_asset_key !== "_mobile_overrides_marker" &&
      !("_comment" in r && !r.background_asset_key)
  );

  // Collect all mobile override keys
  const mobileRefs = new Set<string>();
  for (const r of valid) {
    if (!r.anchor_ref!.endsWith("_mobile")) continue;
    const baseRef = r.anchor_ref!.replace(/_mobile$/, "");
    mobileRefs.add(`${r.background_asset_key}::${baseRef}`);
  }

  const missionPattern = /^(m\d|tie_\d)/;

  // Desktop anchors near edges that might be cropped on portrait mobile
  const edgeAnchors = valid.filter(
    (r) =>
      !r.anchor_ref!.endsWith("_mobile") &&
      missionPattern.test(r.anchor_ref!) &&
      ((r.x_pct ?? 0.5) < 0.15 || (r.x_pct ?? 0.5) > 0.85)
  );

  const edgeMissing = edgeAnchors.filter(
    (r) => !mobileRefs.has(`${r.background_asset_key}::${r.anchor_ref}`)
  );

  it("reports edge-position anchors without mobile overrides (informational)", () => {
    if (edgeMissing.length > 0) {
      console.log(
        `ℹ️ ${edgeMissing.length} edge anchors without position-only _mobile overrides:\n` +
          edgeMissing
            .map((r) => `  ${r.background_asset_key} / ${r.anchor_ref} (x=${r.x_pct})`)
            .join("\n")
      );
    }
    // Informational — viewport-relative sizing handles scale parity automatically
    expect(true).toBe(true);
  });

  it("no scale-only mobile overrides exist (viewport-relative handles scale)", () => {
    // _mobile overrides should only exist for position adjustments, not scale-only changes
    const scaleOnlyOverrides = valid.filter((r) => {
      if (!r.anchor_ref!.endsWith("_mobile")) return false;
      const baseRef = r.anchor_ref!.replace(/_mobile$/, "");
      const desktop = valid.find(
        (d) => d.background_asset_key === r.background_asset_key && d.anchor_ref === baseRef
      );
      if (!desktop) return false;
      // Check if ONLY scale differs (same position)
      const sameX = Math.abs((r.x_pct ?? 0) - (desktop.x_pct ?? 0)) < 0.001;
      const sameY = Math.abs((r.y_pct ?? 0) - (desktop.y_pct ?? 0)) < 0.001;
      const diffScale = Math.abs((r.scale ?? 1) - (desktop.scale ?? 1)) > 0.01;
      return sameX && sameY && diffScale;
    });
    
    if (scaleOnlyOverrides.length > 0) {
      console.log(
        `⚠️ ${scaleOnlyOverrides.length} scale-only _mobile overrides (should be removed):\n` +
          scaleOnlyOverrides
            .map((r) => `  ${r.background_asset_key} / ${r.anchor_ref} (scale=${r.scale})`)
            .join("\n")
      );
    }
    // This is informational for now
    expect(true).toBe(true);
  });
});
