import { describe, it, expect } from "vitest";
import { getAnchorPosition, getStudioQuests } from "@/lib/jsonDataLoader";
import type { AnchorRef } from "@/types/identity";

type OptionKey = "a" | "b";

type MissionBgMap = Record<string, { a: string; b: string }>;

// Mirrors the actual placement background logic in VisualPlayScreen
const PLACEMENT_BG_BY_MISSION: MissionBgMap = {
  studio_01: { a: "studio_entry_inside_bg", b: "studio_entry_inside_bg" },
  studio_02: { a: "gallery_main_stylized_white_v1", b: "gallery_main_stylized_white_v1" },
  studio_03: { a: "studio_doorway_park_view_v5", b: "studio_doorway_park_view_v5" },
  studio_04: { a: "studio_in_workshop_bg", b: "studio_in_workshop_bg" },
  studio_05: { a: "studio_exterior_bg", b: "studio_exterior_bg" },
  studio_06: { a: "studio_in_workshop_bg", b: "studio_in_workshop_bg" },
  studio_07: { a: "studio_in_storage_bg", b: "gallery_main_stylized" },
  studio_08: { a: "studio_in_workshop_bg", b: "studio_in_workshop_bg" },
  studio_09: { a: "studio_doorway_park_view_bg", b: "studio_doorway_park_view_bg" },
  studio_10: { a: "studio_in_workshop_bg", b: "studio_in_workshop_bg" },
  studio_11: { a: "studio_in_workshop_bg", b: "gallery_main_mobile_wide" },
  studio_12: { a: "gallery_main_desktop", b: "gallery_main_desktop" },
  studio_13: { a: "gallery_main_stylized", b: "gallery_main_stylized" },
  studio_14: { a: "studio_in_storage_bg", b: "studio_in_storage_bg" },
  studio_15: { a: "gallery_main_stylized", b: "gallery_main_stylized" },
};

function getBasePx(missionId: string, key: OptionKey): number {
  const isXlarge =
    (missionId === "studio_01" && key === "b") ||
    (missionId === "studio_02" && key === "b");
  return isXlarge ? 160 : 128;
}

describe("deep mobile audit for all 15 main missions", () => {
  const missions = getStudioQuests().slice(0, 15);

  it("has valid anchor placement on mobile and desktop for both options in all 15 missions", () => {
    const failures: string[] = [];

    for (const mission of missions) {
      const bgMap = PLACEMENT_BG_BY_MISSION[mission.mission_id];
      if (!bgMap) {
        failures.push(`${mission.mission_id}: missing placement background mapping`);
        continue;
      }

      (["a", "b"] as const).forEach((key) => {
        const missionNum = mission.mission_id.replace("studio_", "").padStart(2, "0");
        const anchorRef = `m${missionNum}_tool_${key}` as AnchorRef;
        const bgKey = bgMap[key];

        const desktop = getAnchorPosition(bgKey, anchorRef, { isMobile: false });
        const mobile = getAnchorPosition(bgKey, anchorRef, { isMobile: true });

        if (!desktop) {
          failures.push(`${mission.mission_id}/${key}: missing desktop anchor (${bgKey} / ${anchorRef})`);
          return;
        }
        if (!mobile) {
          failures.push(`${mission.mission_id}/${key}: missing mobile anchor resolution (${bgKey} / ${anchorRef})`);
          return;
        }

        const basePx = getBasePx(mission.mission_id, key);
        const desktopPx = +(basePx * desktop.scale).toFixed(1);
        const mobilePx = +(basePx * mobile.scale).toFixed(1);
        const ratio = +(mobilePx / desktopPx).toFixed(3);

        // Hard anti-"ants" guardrail
        if (mobilePx < 96) {
          failures.push(
            `${mission.mission_id}/${key}: mobile too small (${mobilePx}px, desktop=${desktopPx}px, ratio=${ratio})`
          );
        }

        // Guardrail against extreme shrink vs desktop
        if (ratio < 0.4) {
          failures.push(
            `${mission.mission_id}/${key}: excessive shrink (${mobilePx}px vs ${desktopPx}px, ratio=${ratio})`
          );
        }
      });
    }

    if (failures.length) {
      console.log("Deep mission audit failures:\n" + failures.map((f) => `- ${f}`).join("\n"));
    }

    expect(failures).toEqual([]);
  });
});
