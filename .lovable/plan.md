

# Plan: Update T15 Tie-Breaker with Baked Backgrounds

Same pattern as T14 — update text, tooltips, add baked background switching, clean up scene extras.

## Changes

### 1. `studio_tie_v6.json` — T15 entry
- `task_heb` → `"סיימנו שנה מוצלחת ויש תקציב להתרחב. לאן ממשיכים?"`
- `option_a_tooltip_heb` → `"מפה לפתיחת סניפים"`
- `option_b_tooltip_heb` → `"גיליון תכנון תקציבי"`
- Add `"next_bg_override_a": "gallery_tie15a_bg"`, `"next_bg_override_b": "gallery_tie15b_bg"`

### 2. `assetUtils.ts`
- Register 6 new T15 backgrounds (placeholder aliases like T14 until real files are uploaded):
  - Desktop: `gallery_tie15_desk_bg`, `gallery_tie15a_desk_bg`, `gallery_tie15b_desk_bg`
  - Mobile: `gallery_tie15_mobile_bg`, `gallery_tie15a_mobile_bg`, `gallery_tie15b_mobile_bg`

### 3. `jsonDataLoader.ts`
- Add `BG_KEY_ALIASES`: `gallery_tie15a_bg` ↔ `gallery_tie15a_desk_bg`, `gallery_tie15b_bg` ↔ `gallery_tie15b_desk_bg`

### 4. `VisualPlayScreen.tsx`
- Add T15 to `previousBgOverride` platform-aware base bg block (same pattern as T14)
- `getTargetBgForOption` already handles generic `next_bg_override` — no change needed

### 5. `studio_scene_extras.json`
- Remove T15 coffee table extra (lines 114-127) — now baked into backgrounds

### 6. Asset files (user to upload)
- 6 backgrounds: `gallery_tie15[a|b]_[desk|mobile]_bg.webp`
- 2 tools: `studio_tie_15_a.webp`, `studio_tie_15_b.webp` (replace existing)

