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
 * Comprehensive audit: find ALL desktop anchors with scale > 1.2 
 * that lack _mobile overrides — regardless of anchor type.
 * This catches duplicates (m03_tool_b_1, m12_tool_a_1), extras, visitors, etc.
 */
describe("comprehensive mobile override audit", () => {
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

  // ALL mission-related anchors (not structural like wall_back, floor, etc.)
  const missionPattern = /^(m\d|tie_\d)/;

  // Desktop anchors with scale > 1.2 that are mission-related
  const allDesktopAnchors = valid.filter(
    (r) =>
      !r.anchor_ref!.endsWith("_mobile") &&
      missionPattern.test(r.anchor_ref!) &&
      (r.scale ?? 1) > 1.2
  );

  // Categorize by type
  const categorize = (ref: string): string => {
    if (ref.includes("_tool_")) return "tool";
    if (ref.includes("_visitor")) return "visitor";
    if (ref.includes("_avatar")) return "avatar";
    if (ref.includes("_extra_") || ref.includes("_desk") || ref.includes("_crowd") || ref.includes("_staff") || ref.includes("_couple") || ref.includes("_cnc")) return "extra";
    if (ref.includes("_npc")) return "npc";
    return "other";
  };

  const missing = allDesktopAnchors
    .filter((r) => !mobileRefs.has(`${r.background_asset_key}::${r.anchor_ref}`))
    .map((r) => ({
      bg: r.background_asset_key!,
      anchor: r.anchor_ref!,
      scale: r.scale ?? 1,
      category: categorize(r.anchor_ref!),
      x: r.x_pct ?? 0.5,
      y: r.y_pct ?? 0.5,
    }));

  // Report by category
  const tools = missing.filter((m) => m.category === "tool");
  const visitors = missing.filter((m) => m.category === "visitor");
  const extras = missing.filter((m) => m.category === "extra");
  const others = missing.filter((m) => !["tool", "visitor", "extra"].includes(m.category));

  it("reports missing mobile overrides by category", () => {
    const report = [
      `\n=== TOOLS (${tools.length}) ===`,
      ...tools.map((t) => `  ${t.bg} / ${t.anchor} (scale ${t.scale}, x=${t.x}, y=${t.y})`),
      `\n=== VISITORS (${visitors.length}) ===`,
      ...visitors.map((v) => `  ${v.bg} / ${v.anchor} (scale ${v.scale})`),
      `\n=== EXTRAS (${extras.length}) ===`,
      ...extras.map((e) => `  ${e.bg} / ${e.anchor} (scale ${e.scale})`),
      `\n=== OTHER (${others.length}) ===`,
      ...others.map((o) => `  ${o.bg} / ${o.anchor} (scale ${o.scale})`),
      `\n=== TOTAL MISSING: ${missing.length} ===`,
    ].join("\n");

    console.log(report);

    // This test always passes — it's a diagnostic report.
    // The actionable test below enforces the threshold.
    expect(true).toBe(true);
  });

  it("all tool anchors with scale > 1.5 have mobile overrides (strict)", () => {
    const criticalTools = tools.filter((t) => t.scale > 1.5);
    expect(
      criticalTools.map((t) => `${t.bg} / ${t.anchor} (scale ${t.scale})`),
      `Critical tool anchors missing mobile overrides`
    ).toEqual([]);
  });

  it("all visitor/avatar anchors with scale > 1.5 have mobile overrides", () => {
    const criticalVisitors = [...visitors, ...missing.filter((m) => m.category === "avatar")]
      .filter((v) => v.scale > 1.5);
    expect(
      criticalVisitors.map((v) => `${v.bg} / ${v.anchor} (scale ${v.scale})`),
      `Critical visitor/avatar anchors missing mobile overrides`
    ).toEqual([]);
  });

  it("all extras with scale > 1.5 have mobile overrides", () => {
    const criticalExtras = extras.filter((e) => e.scale > 1.5);
    expect(
      criticalExtras.map((e) => `${e.bg} / ${e.anchor} (scale ${e.scale})`),
      `Critical extras missing mobile overrides`
    ).toEqual([]);
  });
});
