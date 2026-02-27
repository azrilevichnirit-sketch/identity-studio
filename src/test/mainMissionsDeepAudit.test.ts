import { describe, it, expect } from "vitest";
import { getAnchorPosition, getStudioQuests } from "@/lib/jsonDataLoader";
import type { AnchorRef } from "@/types/identity";

type OptionKey = "a" | "b";

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

// Deep parity base (mirrors VisualPlayScreen logic)
function getBasePxForViewport(_width: number, missionId: string, key: OptionKey): number {
  const isXlarge =
    (missionId === "studio_01" && key === "b") ||
    (missionId === "studio_02" && key === "b");
  const viewportBase = 128;
  const factor = isXlarge ? 160 / 128 : 1;
  return Math.round(viewportBase * factor);
}

function checkAnchorAtViewport(
  bgKey: string,
  anchorRef: AnchorRef,
  viewportWidth: number,
  basePx: number,
  label: string,
  isMobile: boolean,
): string | null {
  const pos = getAnchorPosition(bgKey, anchorRef, { isMobile });
  if (!pos) return `${label}: no anchor (${bgKey} / ${anchorRef})`;

  const px = +(basePx * pos.scale).toFixed(1);
  const minPx = viewportWidth <= 360 ? 76 : viewportWidth <= 820 ? 84 : 80;

  if (px < minPx) return `${label}: too small ${px}px at ${viewportWidth}px viewport (min=${minPx}px)`;
  return null;
}

function checkMissionToolAtViewport(missionId: string, key: OptionKey, viewportWidth: number): string | null {
  const bgMap = PLACEMENT_BG[missionId];
  if (!bgMap) return `missing placement background mapping`;
  const missionNum = missionId.replace("studio_", "").padStart(2, "0");
  const anchorRef = `m${missionNum}_tool_${key}` as AnchorRef;
  const isMobile = viewportWidth <= 820;
  const basePx = getBasePxForViewport(viewportWidth, missionId, key);
  return checkAnchorAtViewport(bgMap[key], anchorRef, viewportWidth, basePx, "tool", isMobile);
}

const MISSION_EXTRAS: Record<string, { bgKey: string; anchors: string[] }> = {
  studio_08: { bgKey: "studio_in_workshop_bg", anchors: ["m08_visitor_01", "m08_visitor_02", "m08_visitor_03", "m08_avatar"] },
  studio_10: { bgKey: "studio_in_workshop_bg", anchors: ["m10_extra_desk", "m10_extra_staff", "m10_extra_staff_b"] },
  studio_11: { bgKey: "studio_in_workshop_bg", anchors: ["m11_avatar"] },
  studio_11_crowd: { bgKey: "gallery_main_mobile_wide", anchors: ["m11_crowd"] },
  studio_13: { bgKey: "gallery_main_stylized", anchors: ["m13_desk_a", "m13_desk_b", "m13_desk_c", "m13_extra_couple", "m13_extra_staff"] },
};

const VIEWPORTS = [
  { width: 1366, label: "desktop", isMobile: false },
  { width: 820, label: "tablet", isMobile: true },
  { width: 360, label: "phone", isMobile: true },
];

describe("deep mobile audit — all 15 missions at 3 viewports", () => {
  const missions = getStudioQuests().slice(0, 15);

  for (const vp of VIEWPORTS) {
    describe(`${vp.label} (${vp.width}px)`, () => {
      missions.forEach((mission, idx) => {
        const num = idx + 1;
        const prefix = `M${String(num).padStart(2, "0")}`;

        it(`${prefix} Tool A`, () => {
          const err = checkMissionToolAtViewport(mission.mission_id, "a", vp.width);
          if (err) console.log(`❌ ${err}`);
          expect(err).toBeNull();
        });

        it(`${prefix} Tool B`, () => {
          const err = checkMissionToolAtViewport(mission.mission_id, "b", vp.width);
          if (err) console.log(`❌ ${err}`);
          expect(err).toBeNull();
        });
      });
    });
  }
});

describe("extras audit — M08, M10, M11, M13 at phone (360px)", () => {
  for (const [missionId, config] of Object.entries(MISSION_EXTRAS)) {
    config.anchors.forEach((anchorRef) => {
      it(`${missionId} / ${anchorRef}`, () => {
        const basePx = getBasePxForViewport(360, missionId.startsWith("studio_") ? missionId : "studio_11", "a");
        const err = checkAnchorAtViewport(config.bgKey, anchorRef as AnchorRef, 360, basePx, anchorRef, true);
        if (err) console.log(`❌ ${err}`);
        expect(err).toBeNull();
      });
    });
  }
});
