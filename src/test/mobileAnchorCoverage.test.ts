import { describe, it, expect } from "vitest";
import anchorData from "@/data/studio_anchor_map.json";

interface AnchorEntry {
  background_asset_key?: string;
  anchor_ref?: string;
  scale?: number;
  _comment?: string;
}

// Mirror the alias map from jsonDataLoader so we check across aliases
const BG_KEY_ALIASES: Record<string, string[]> = {
  studio_doorway_park_view_bg: ['studio_doorway_park_view_v5'],
  studio_doorway_park_view_v5: ['studio_doorway_park_view_bg'],
  studio_in_storage_bg: ['studio_in_storage_v2'],
  studio_in_storage_v2: ['studio_in_storage_bg'],
  studio_in_workshop_bg: ['studio_in_workshop_v3'],
  studio_in_workshop_v3: ['studio_in_workshop_bg'],
  studio_in_entrance_view_bg: ['studio_entrance_view_stylized_v7'],
  studio_entrance_view_stylized_v7: ['studio_in_entrance_view_bg'],
  studio_exterior_bg: ['studio_exterior_park_bg', 'studio_exterior_park_stylized_v3', 'studio_exterior'],
  studio_exterior_park_bg: ['studio_exterior_bg', 'studio_exterior_park_stylized_v3', 'studio_exterior'],
  studio_exterior_park_stylized_v3: ['studio_exterior_bg', 'studio_exterior_park_bg', 'studio_exterior'],
  studio_entry_inside_bg: ['gallery_main_stylized_v3'],
  gallery_main_stylized_v3: ['studio_entry_inside_bg', 'studio_front_bg', 'studio_in_gallery_bg'],
  studio_in_gallery_wall_bg: ['gallery_main_stylized_white_v1'],
  gallery_main_stylized_white_v1: ['studio_in_gallery_wall_bg'],
};

function getBgCandidates(bgKey: string): string[] {
  return [bgKey, ...(BG_KEY_ALIASES[bgKey] ?? [])];
}

describe("mobile anchor override coverage", () => {
  const rows = anchorData as AnchorEntry[];

  const valid = rows.filter(
    (r) =>
      r.background_asset_key &&
      r.anchor_ref &&
      r.background_asset_key !== "_mobile_overrides_marker" &&
      !("_comment" in r && !r.background_asset_key)
  );

  // Build set of all mobile overrides keyed by anchor_ref (without _mobile suffix)
  // across all background aliases
  const mobileOverrideSet = new Set<string>();
  for (const r of valid) {
    if (!r.anchor_ref!.endsWith("_mobile")) continue;
    const baseRef = r.anchor_ref!.replace(/_mobile$/, "");
    for (const bg of getBgCandidates(r.background_asset_key!)) {
      mobileOverrideSet.add(`${bg}::${baseRef}`);
    }
  }

  const missionPattern = /^(m\d|tie_\d|.*_extra_|.*_visitor_|.*_avatar|.*_desk|.*_crowd|.*_staff|.*_couple)/;

  const needOverride = valid.filter(
    (r) =>
      !r.anchor_ref!.endsWith("_mobile") &&
      missionPattern.test(r.anchor_ref!) &&
      (r.scale ?? 1) > 1.2
  );

  // Check if ANY alias of the bg has a mobile override for this anchor
  const missing = needOverride.filter((r) => {
    const candidates = getBgCandidates(r.background_asset_key!);
    return !candidates.some((bg) => mobileOverrideSet.has(`${bg}::${r.anchor_ref}`));
  }).map((r) => `${r.background_asset_key} / ${r.anchor_ref} (scale ${r.scale})`);

  it("every mission anchor with desktop scale > 1.2 has a _mobile override", () => {
    expect(
      missing,
      `Missing mobile overrides:\n${missing.join("\n")}`
    ).toEqual([]);
  });
});
