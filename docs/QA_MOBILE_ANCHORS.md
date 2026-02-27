# QA Report: Mobile Anchor Calibration
**Date:** 2026-02-27  
**Viewports tested:** 360px, 414px, 768px, 820px  
**File:** `src/data/studio_anchor_map.json`  
**Resolver:** `src/lib/jsonDataLoader.ts` → `getAnchorPosition()`

---

## System Architecture

- **Desktop anchors** = base values (no `_mobile` suffix)
- **Mobile overrides** = `anchor_ref + "_mobile"` entries, checked first on `isMobile`
- **Fallback compression** = `getMobileFallbackScale()` in `jsonDataLoader.ts` — applies non-linear scale reduction when no explicit `_mobile` override exists:
  - scale ≤ 1.2 → unchanged
  - scale 1.2–1.8 → `scale × 0.88`
  - scale > 1.8 → `1.35 + (scale - 1.8) × 0.38`
- **Base sprite size** = 128px (all platforms, no mobile compression)

---

## Main Missions (M01–M15)

| Mission | BG Key | Anchor | Desktop Scale | Mobile Scale | Mobile Override? | Notes |
|---------|--------|--------|--------------|-------------|-----------------|-------|
| **M01** | gallery_main_stylized_v3 | m01_tool_a | 2.6 | 1.5 | ✅ | |
| | | m01_tool_b | 2.9 | 1.6 | ✅ | |
| **M02** | gallery_main_stylized_white_v1 | m02_tool_a | 1.8 | 1.0 | ✅ | Added 2026-02-27 |
| | | m02_tool_b | 2.0 | 1.2 | ✅ | Added 2026-02-27 |
| **M03** | studio_doorway_park_view_v5 | m03_tool_a | 2.7 | 1.5 | ✅ | x=81.5% (far right risk) |
| | | m03_tool_b | 3.3 | 1.8 | ✅ | 3 duplicates (bar tables) |
| | | m03_visitor_01–04 | 1.3–1.8 | fallback | ❌ | Auto-compressed |
| **M04** | studio_in_workshop_bg | m04_tool_a | 3.3 | 1.8 | ✅ | |
| | | m04_tool_b | 3.4 | 1.9 | ✅ | |
| **M05** | studio_exterior_bg | m05_tool_a | 3.1 | 1.6 | ✅ | Was 1.7, tuned down |
| | | m05_tool_b | 3.3 | 1.6 | ✅ | Was 1.8, tuned down |
| | | m05_visitor_01 | 1.6 | 1.0 | ✅ | **NEW** — was missing |
| | | m05_visitor_02 | 1.3 | 0.8 | ✅ | **NEW** — was missing |
| | | m05_visitor_03 | 1.4 | 0.9 | ✅ | **NEW** — was missing |
| **M06** | studio_in_entrance_view_bg | m06_tool_a/b | 2.4/1.9 | fallback | ❌ | Auto-compressed |
| **M07** | studio_in_storage_bg / gallery | m07_tool_a | 3.4 | 1.8 | ✅ | x=20% (far left risk) |
| | | m07_tool_b | 4.2 | 2.2 | ✅ | |
| **M08** | studio_in_workshop_bg | m08_tool_a | 2.5 | 1.5 | ✅ | x=11.3% → 18% on mobile |
| | | m08_tool_b | 2.2 | 1.4 | ✅ | |
| | | m08_visitor_01 | 1.7 | 1.0 | ✅ | **NEW** — was missing |
| | | m08_visitor_02 | 2.8 | 1.6 | ✅ | Was 1.8, tuned |
| | | m08_visitor_03 | 3.0 | 1.7 | ✅ | Was 1.9, tuned |
| | | m08_avatar | 2.6 | 1.5 | ✅ | |
| **M09** | studio_doorway_park_view_bg | m09_tool_a | 2.5 | 1.5 | ✅ | |
| | | m09_tool_b | 2.7 | 1.6 | ✅ | |
| | | m09_extra_crowd | 4.1 | 2.2 | ✅ | Was 2.5, tuned |
| **M10** | studio_in_workshop_bg | m10_tool_a | 1.3 | 1.3 | ✅ | Same (small scale) |
| | | m10_tool_b | 1.3 | 1.3 | ✅ | Same |
| | | m10_extra_desk | 2.2 | 1.3 | ✅ | Was 1.5, tuned |
| | | m10_extra_staff | 2.9 | 1.6 | ✅ | Was 1.8, tuned |
| | | m10_extra_staff_b | 2.9 | 1.6 | ✅ | Was 1.8, tuned |
| **M11** | workshop / gallery_mobile_wide | m11_tool_a | 3.1 | 1.7 | ✅ | |
| | | m11_tool_b | 3.7 | 1.8 | ✅ | Was 2.0, tuned |
| | | m11_crowd | 3.3 | 1.6 | ✅ | Was 1.8, tuned |
| | | m11_avatar | 2.8 | 1.6 | ✅ | |
| **M12** | gallery_main_desktop | m12_tool_a | 1.3 | 1.6 | ✅ | |
| | | m12_tool_b | 2.9 | 2.2 | ✅ | Removed stale duplicates |
| **M13** | gallery_main_stylized | m13_tool_a | 0.9 | 0.9 | ✅ | Same (small) |
| | | m13_tool_b | 1.2 | 1.0 | ✅ | Was 1.2, tuned |
| | | m13_desk_a | 2.2 | 0.9 | ✅ | |
| | | m13_desk_b | 2.7 | 1.1 | ✅ | |
| | | m13_desk_c | 2.2 | 0.9 | ✅ | |
| | | m13_extra_couple | 3.6 | 1.4 | ✅ | |
| | | m13_extra_staff | 3.4 | 1.3 | ✅ | |
| **M14** | studio_in_storage_bg | m14_tool_a | 1.5 | 1.0 | ✅ | Added 2026-02-27 |
| | | m14_tool_b | 2.5 | 1.5 | ✅ | |
| **M15** | gallery_main_stylized | m15_tool_a | 3.3 | 1.8 | ✅ | |
| | | m15_tool_b | 1.4 | 1.0 | ✅ | |

---

## Tie-Breakers (T01–T15)

| TB | BG Key | Anchor | Desktop Scale | Mobile Scale | Override? | Notes |
|----|--------|--------|--------------|-------------|-----------|-------|
| **T02** | gallery_white_v1 | tie_02_tool_b | 1.9 | 1.2 | ✅ | x nudged 9.2%→15% |
| **T03** | gallery_white_v1 | tie_03_tool_a | 4.6 | 2.0 | ✅ | |
| **T04** | gallery_white_v1 | tie_04_tool_b | 4.9 | 2.2 | ✅ | |
| **T05** | gallery_white_v1 | tie_05_tool_a | 5.6 | 2.5 | ✅ | |
| | | tie_05_tool_b | 2.8 | 1.6 | ✅ | |
| **T06** | gallery_white_v1 | tie_06_tool_a | 2.0 | 1.2 | ✅ | |
| | | tie_06_tool_b | 2.2 | 1.3 | ✅ | |
| **T07** | storage/gallery | tie_07_tool_a | 4.0 | 2.0 | ✅ | |
| | | tie_07_tool_b | 2.7 | 1.5 | ✅ | |
| **T08** | gallery/exterior | tie_08_tool_a | 3.6 | 1.8 | ✅ | |
| | | tie_08_tool_b | 2.2 | 1.3 | ✅ | |
| **T09** | storage | tie_09_tool_a | 1.7 | 1.1 | ✅ | |
| | | tie_09_tool_b | 2.2 | 1.3 | ✅ | |
| **T10** | gallery_stylized | tie_10_tool_a | 2.3 | 1.4 | ✅ | |
| | | tie_10_tool_b | 2.6 | 1.5 | ✅ | |
| **T11** | gallery_stylized | tie_11_tool_a | 3.9 | 2.0 | ✅ | |
| | | tie_11_tool_b | 3.5 | 1.8 | ✅ | |
| **T12** | gallery_stylized | tie_12_tool_a | 6.0 | 2.5 | ✅ | |
| | | tie_12_tool_b | 3.0 | 1.6 | ✅ | |
| **T14** | doorway_park_view | tie_14_tool_a | 2.3 | 1.4 | ✅ | |

---

## Bugs Fixed (2026-02-27)

1. **Phantom anchors from `_comment` entries** — `parseAnchorMap()` now filters out objects with `_comment` key or empty `background_asset_key`.
2. **M11 duplicate override** — Earlier `m11_tool_a_mobile` (scale 2.0) was shadowing corrected value (1.7). Removed stale entry.
3. **M12 dead duplicate** — Removed unreachable `gallery_main_desktop` entries (scale 4.4) that were shadowed by first-match.
4. **Missing M05 visitor mobile overrides** — Visitors had desktop scales (1.3–1.6) rendering oversized. Added explicit `_mobile` anchors.
5. **Missing M08 visitor_01 mobile override** — Only 02/03 had overrides. Added visitor_01_mobile.
6. **Fallback compression** — Added `getMobileFallbackScale()` for any anchor without explicit `_mobile` — prevents future oversized rendering.

---

## Risk Anchors (Extreme X positions)

| Anchor | x_pct | Risk | Mitigation |
|--------|-------|------|------------|
| m08_tool_a | 11.3% (desktop) → 18% (mobile) | Left crop on cover | Mobile override shifts right |
| m07_tool_a | 11.5% (desktop) → 20% (mobile) | Left crop | Mobile override shifts right |
| m03_tool_a | 81.5% | Right edge | Within safe zone with cover |
| tie_14_tool_a | 81.9% | Right edge | Within safe zone |
