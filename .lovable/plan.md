

## Plan: Expand from 12 to 15 Main Missions

### Overview
Update all mission data files from 12 to 15 main missions, add new tool images, and update hardcoded references throughout the codebase. The game logic stays the same -- just more missions before the tie-breaker phase.

---

### Step 1: Copy New Tool Images
Copy the 10 uploaded tool images to `src/assets/tools/`:
- `studio_11_a.webp` (replaces existing - blueprint table)
- `studio_11_b.webp` (replaces existing - stage)
- `studio_12_a.webp` (replaces existing - art kit)
- `studio_12_b.webp` (replaces existing - craft table)
- `studio_13_a.webp` (new - tablet with gallery)
- `studio_13_b.webp` (new - price quote folder)
- `studio_14_a.webp` (new - barcode scanner)
- `studio_14_b.webp` (new - packing station)
- `studio_15_a.webp` (new - sculpture)
- `studio_15_b.webp` (new - trophy)

### Step 2: Update `missions_studio_main.json`
Replace all 12 entries with 15, using the new JSON data:
- Missions 1-10: Update task texts, Holland codes, and tooltips per the uploaded JSON
- Missions 11-12: Update with new content (texts, codes, tooltips, assets)
- Missions 13-15: Add 3 new entries

### Step 3: Update `studio_quests_v5.json` (Source of Truth)
Update the flat-format quest data with all 15 missions. Each entry keeps its existing structure (`quest_id`, `order`, `view`, `bg_override`, `option_a_code`, etc.). New missions 13-15 will use placeholder backgrounds and anchor refs (to be calibrated later).

### Step 4: Update `assetUtils.ts`
- Add imports for `studio_13_a`, `studio_13_b`, `studio_14_a`, `studio_14_b`, `studio_15_a`, `studio_15_b`
- Add these 6 entries to the `toolAssets` map

### Step 5: Update `useGameState.ts`
- Change mission range validation from `<= 12` to `<= 15` in `getInitialMissionIndex()`

### Step 6: Update `VisualPlayScreen.tsx`
Update hardcoded mission references:
- The "clean scene reset" rule for `studio_12` should now apply to the last mission (`studio_15`)
- Zone mapping (`getZoneForMission`): extend to cover missions 13-15
- `hidePersistedToolsForThisMission`: update `studio_12` reference to `studio_15` (final mission gets clean scene)
- Background logic for mission 12: remove the special case (it is no longer the final mission using `gallery_main_stylized`)

### Step 7: Update `useSceneExtras.ts`
The `checkShouldSpawn` function parses mission order from `studio_XX` -- this will naturally work for missions 13-15 without changes.

---

### Technical Details

**Holland Code Distribution (new 15 missions):**
| Code | Missions |
|------|----------|
| R | M2a, M6a, M10a, M14a |
| I | M1a, M8a, M11a, M12a |
| A | M3a, M6b(?), M13a, M15a |
| S | M3b(?), M4a, M5b, M9a, M12b |
| E | M5a, M7b, M8b, M10b, M15b |
| C | M1b, M7a, M9b, M13b, M14b |

**New Mission Backgrounds (initial, to be calibrated):**
- M13: `gallery_main_stylized` (indoor gallery)
- M14: `studio_in_storage_bg` (storage/packing area)
- M15: `gallery_main_stylized` (final indoor gallery)

**Anchor refs for new missions (placeholder, need calibration):**
- M13: `m13_tool_a`, `m13_tool_b`
- M14: `m14_tool_a`, `m14_tool_b`
- M15: `m15_tool_a`, `m15_tool_b`

Placeholder anchors will be added to `studio_anchor_map.json` with center positions so the tools are visible. You will calibrate exact positions later using the visual editor.

