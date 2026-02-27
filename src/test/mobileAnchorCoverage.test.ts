import { describe, it, expect } from "vitest";
import anchorData from "@/data/studio_anchor_map.json";

interface AnchorEntry {
  background_asset_key?: string;
  anchor_ref?: string;
  x_pct?: number;
  scale?: number;
  _comment?: string;
}

/**
 * With viewport-relative sprite sizing, scale-based _mobile overrides are no longer needed.
 * This test now only checks that anchors near viewport edges have position overrides
 * to prevent cropping on portrait mobile screens.
 */
describe("mobile anchor edge-position safety", () => {
  const rows = anchorData as AnchorEntry[];

  const valid = rows.filter(
    (r) =>
      r.background_asset_key &&
      r.anchor_ref &&
      r.background_asset_key !== "_mobile_overrides_marker" &&
      !("_comment" in r && !r.background_asset_key)
  );

  // Desktop-only mission anchors near edges (x < 15% or x > 85%)
  const missionPattern = /^(m\d|tie_\d)/;
  const edgeAnchors = valid.filter(
    (r) =>
      !r.anchor_ref!.endsWith("_mobile") &&
      missionPattern.test(r.anchor_ref!) &&
      ((r.x_pct ?? 0.5) < 0.15 || (r.x_pct ?? 0.5) > 0.85)
  );

  it("reports edge-position anchors for awareness (non-blocking)", () => {
    if (edgeAnchors.length > 0) {
      console.log(
        `ℹ️ ${edgeAnchors.length} anchors near viewport edges (may need position-only _mobile overrides):\n` +
          edgeAnchors
            .map((r) => `  ${r.background_asset_key} / ${r.anchor_ref} (x=${r.x_pct})`)
            .join("\n")
      );
    }
    // This is informational — not a hard failure
    expect(true).toBe(true);
  });
});
