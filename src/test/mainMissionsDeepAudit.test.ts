import { describe, it, expect } from "vitest";
import { getAnchorPosition, getStudioQuests } from "@/lib/jsonDataLoader";
import type { AnchorRef } from "@/types/identity";

type OptionKey = "a" | "b";

// Mirrors the actual placement background logic in VisualPlayScreen
const PLACEMENT_BG: Record<string, { a: string; b: string }> = {
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

function checkMissionTool(missionId: string, key: OptionKey): string | null {
  const bgMap = PLACEMENT_BG[missionId];
  if (!bgMap) return `missing placement background mapping`;

  const missionNum = missionId.replace("studio_", "").padStart(2, "0");
  const anchorRef = `m${missionNum}_tool_${key}` as AnchorRef;
  const bgKey = bgMap[key];

  const desktop = getAnchorPosition(bgKey, anchorRef, { isMobile: false });
  const mobile = getAnchorPosition(bgKey, anchorRef, { isMobile: true });

  if (!desktop) return `no desktop anchor (${bgKey} / ${anchorRef})`;
  if (!mobile) return `no mobile anchor (${bgKey} / ${anchorRef})`;

  const basePx = getBasePx(missionId, key);
  const desktopPx = +(basePx * desktop.scale).toFixed(1);
  const mobilePx = +(basePx * mobile.scale).toFixed(1);
  const ratio = +(mobilePx / desktopPx).toFixed(3);

  if (mobilePx < 96) return `mobile too small: ${mobilePx}px (desktop=${desktopPx}px, ratio=${ratio})`;
  if (ratio < 0.4) return `excessive shrink: ratio=${ratio} (${mobilePx}px vs ${desktopPx}px)`;

  return null; // pass
}

describe("deep mobile audit — all 15 main missions", () => {
  const missions = getStudioQuests().slice(0, 15);

  missions.forEach((mission, idx) => {
    const num = idx + 1;

    it(`M${String(num).padStart(2, "0")} Tool A — anchor resolves & mobile size OK`, () => {
      const err = checkMissionTool(mission.mission_id, "a");
      if (err) console.log(`❌ ${mission.mission_id}/a: ${err}`);
      expect(err).toBeNull();
    });

    it(`M${String(num).padStart(2, "0")} Tool B — anchor resolves & mobile size OK`, () => {
      const err = checkMissionTool(mission.mission_id, "b");
      if (err) console.log(`❌ ${mission.mission_id}/b: ${err}`);
      expect(err).toBeNull();
    });
  });
});
