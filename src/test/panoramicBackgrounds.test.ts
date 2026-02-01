import { describe, it, expect } from "vitest";

import missionsMain from "@/data/missions_studio_main.json";
import missionsTie from "@/data/studio_tie_v5.json";
import { getPanoramicBackground } from "@/lib/assetUtils";

type AnyMission = {
  bg_override?: string;
  options?: Array<{
    next_bg_override?: string;
    calibration_bg?: string;
  }>;
};

function collectMissionBgKeys(missions: AnyMission[]) {
  const keys = new Set<string>();
  for (const m of missions) {
    if (m.bg_override) keys.add(m.bg_override);
    for (const opt of m.options ?? []) {
      if (opt.next_bg_override) keys.add(opt.next_bg_override);
      if (opt.calibration_bg) keys.add(opt.calibration_bg);
    }
  }
  return keys;
}

describe("mobile panning: panoramic background coverage", () => {
  it("covers all backgrounds referenced by missions", () => {
    const keys = new Set<string>([
      ...collectMissionBgKeys(missionsMain as unknown as AnyMission[]),
      ...collectMissionBgKeys(missionsTie as unknown as AnyMission[]),

      // Explicit keys used by gameplay locks / fallbacks
      "studio_front_bg",
      "studio_entry_inside_bg",
      "gallery_main_stylized_v3",
      "gallery_main_stylized",
      "gallery_main_stylized_white_v1",
      "studio_in_gallery_wall_bg",
      "studio_in_workshop_bg",
      "studio_in_storage_bg",
      "studio_in_entrance_view_bg",
      "studio_exterior_bg",
      "studio_exterior_park_bg",
    ]);

    const missing = [...keys]
      .filter(Boolean)
      .filter((k) => getPanoramicBackground(k) == null)
      .sort();

    expect(
      missing,
      `Missing panoramic mapping for: ${missing.join(", ")}`
    ).toEqual([]);
  });
});
